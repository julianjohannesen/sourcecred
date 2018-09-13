// @flow

import * as RV from "../relationalView";
import * as N from "../nodes";
import type {ConnectionJSON} from "../graphql";
import deepEqual from "lodash.isequal";

import {findMentionsAuthorReferences} from "./mentionsAuthorReference";

describe("plugins/github/heuristics/mentionsAuthorReference", () => {
  function exampleRelationalView(): RV.RelationalView {
    const view = new RV.RelationalView();
    function connection<T>(nodes: $ReadOnlyArray<T>): ConnectionJSON<T> {
      return {
        nodes,
        pageInfo: {
          endCursor: "cursor:ignored",
          hasNextPage: false,
        },
      };
    }

    const authors = {
      steven: () => ({
        __typename: "User",
        id: "user:steven",
        login: "steven",
        url: "https://github.com/steven",
      }),
      garnet: () => ({
        __typename: "User",
        id: "user:garnet",
        login: "garnet",
        url: "https://github.com/garnet",
      }),
      amethyst: () => ({
        __typename: "User",
        id: "user:amethyst",
        login: "amethyst",
        url: "https://github.com/amethyst",
      }),
      pearl: () => ({
        __typename: "User",
        id: "user:pearl",
        login: "pearl",
        url: "https://github.com/pearl",
      }),
      holo: () => ({
        __typename: "User",
        id: "user:holo-pearl",
        login: "holo-pearl",
        url: "https://github.com/holo-pearl",
      }),
    };

    const repoUrl = "https://github.com/my-owner/my-repo";
    function issueUrl(number: number): string {
      return `${repoUrl}/issues/${String(number)}`;
    }
    function issueCommentUrl(issueNumber: number, commentNumber: number) {
      return `${issueUrl(issueNumber)}#issuecomment-${commentNumber}`;
    }

    const data = {
      repository: {
        id: "repo:my-repo",
        issues: connection([
          {
            id: "issue:1",
            url: issueUrl(1),
            number: 1,
            title: "calling into the void",
            body: "hi @amethyst",
            author: authors.steven(),
            comments: connection([]),
          },
          {
            id: "issue:2",
            number: 2,
            url: issueUrl(2),
            title: "an issue with many types of references",
            body: "it is me, @steven\n\nPaired with: @pearl",
            author: authors.steven(),
            comments: connection([
              {
                id: "comment:2_1",
                url: issueCommentUrl(2, 1),
                body: "parry parry thrust @pearl\nparry parry thrust @steven",
                author: authors.holo(),
              },
              {
                id: "comment:2_2",
                url: issueCommentUrl(2, 2),
                body: "@holo-pearl: stop!",
                author: authors.steven(),
              },
              {
                id: "comment:2_3",
                url: issueCommentUrl(2, 3),
                body: "@amethyst @garnet why aren't you helping",
                author: authors.pearl(),
              },
              {
                id: "comment:2_4",
                url: issueCommentUrl(2, 4),
                body: "@amethyst! come quickly, @amethyst!",
                author: authors.garnet(),
              },
              {
                id: "comment:2_5",
                url: issueCommentUrl(2, 5),
                body: "i am busy fighting @boomerang-blade guy",
                author: authors.amethyst(),
              },
            ]),
          },
        ]),
        pulls: connection([
          {
            id: "pull:3",
            url: "https://github.com/my-owner/my-repo/pulls/3",
            number: 3,
            body: "Self referentially yours: @steven",
            additions: 0,
            deletions: 0,
            comments: connection([]),
            author: authors.steven(),
            reviews: connection([]),
          },
        ]),
        url: "https://github.com/my-owner/my-repo",
        name: "my-repo",
        owner: {
          __typename: "Organization",
          id: "org:my-owner",
          login: "my-owner",
          url: "https://github.com/my-owner",
        },
      },
    };
    view.addData(data);
    return view;
  }

  describe("findMentionsAuthorReferences", () => {
    // Tracks all expected references, across test cases, so that we can verify
    // at the end that no unexpected references are present.
    let expectedMentionsAuthorReferences = [];
    function expectReferences(name, references) {
      expectedMentionsAuthorReferences.push(...references);

      const relationalView = exampleRelationalView();
      const allMentionsAuthorReferences = Array.from(
        findMentionsAuthorReferences(relationalView)
      );

      it(`has references for ${name}`, () => {
        for (const {src, dst, who} of references) {
          // For clarity in debugging: Error early if our src/dst/who is
          // not actually present in the RelationalView
          expect(relationalView.entity(src)).toEqual(expect.anything());
          expect(relationalView.entity(dst)).toEqual(expect.anything());
          expect(relationalView.entity(who)).toEqual(expect.anything());
          // Then verify that the reference is actually present
          expect(allMentionsAuthorReferences).toContainEqual({src, dst, who});
        }
      });
    }

    const repo = {type: N.REPO_TYPE, owner: "my-owner", name: "my-repo"};
    function issueAddress(number: number): N.IssueAddress {
      return {type: N.ISSUE_TYPE, repo, number: String(number)};
    }

    function commentAddress(
      issueNum: number,
      commentNum: number
    ): N.CommentAddress {
      const id = String(commentNum);
      return {type: N.COMMENT_TYPE, parent: issueAddress(issueNum), id};
    }

    const users = Object.freeze({
      pearl: {type: N.USERLIKE_TYPE, subtype: N.USER_SUBTYPE, login: "pearl"},
      steven: {type: N.USERLIKE_TYPE, subtype: N.USER_SUBTYPE, login: "steven"},
      holoPearl: {
        type: N.USERLIKE_TYPE,
        subtype: N.USER_SUBTYPE,
        login: "holo-pearl",
      },
      amethyst: {
        type: N.USERLIKE_TYPE,
        subtype: N.USER_SUBTYPE,
        login: "amethyst",
      },
      garnet: {type: N.USERLIKE_TYPE, subtype: N.USER_SUBTYPE, login: "garnet"},
    });

    /** The test cases below are organized so that for every
     * post in the thread rooted at Issue #2, we expect all
     * of the new MentionsAuthorReferences that were created
     * as a result of that post (whether because that post is
     * the src or the dst). At the end, we verify that every
     * MentionsAuthorReference is accounted for. */

    // If an author references themself, there will be a self-directed
    // MentionsAuthorReference.
    expectReferences("issue:2", [
      {
        src: issueAddress(2),
        dst: issueAddress(2),
        who: users.steven,
      },
    ]);
    // When there was a multi-author, one comment could produce multiple
    // edges from the same src to the same dst. The `who` field
    // disambiguates.
    expectReferences("comment:2_1", [
      {
        src: commentAddress(2, 1),
        dst: issueAddress(2),
        who: users.pearl,
      },
      {
        src: commentAddress(2, 1),
        dst: issueAddress(2),
        who: users.steven,
      },
    ]);
    expectReferences("comment:2_2", [
      {
        src: commentAddress(2, 2),
        dst: commentAddress(2, 1),
        who: users.holoPearl,
      },
      // Because Steven self-referenced, that post references all of Steven's
      // other posts.  (If people use this for gaming, we can reconsider, but
      // it should be fairly obvious)
      {src: issueAddress(2), dst: commentAddress(2, 2), who: users.steven},
      {src: commentAddress(2, 1), dst: commentAddress(2, 2), who: users.steven},
    ]);
    //
    expectReferences("comment:2_3", [
      {
        src: commentAddress(2, 1),
        dst: commentAddress(2, 3),
        who: users.pearl,
      },
    ]);
    // This test case demonstrates that post 2_3, which mentioned @garnet before
    // she participated in the thread, still creates a reference once @garnet
    // appears.
    expectReferences("comment:2_4", [
      {
        src: commentAddress(2, 3),
        dst: commentAddress(2, 4),
        who: users.garnet,
      },
    ]);
    // This test case demonstrates two interesting properties:
    // - comment(2,3) generated two different MentionsAuthorReferences to
    // different authors
    // - comment(2,4) created two identical MentionsAuthorReferences
    // pointing to this one
    expectReferences("comment:2_5", [
      {
        src: commentAddress(2, 3),
        dst: commentAddress(2, 5),
        who: users.amethyst,
      },
      {
        src: commentAddress(2, 4),
        dst: commentAddress(2, 5),
        who: users.amethyst,
      },
      {
        src: commentAddress(2, 4),
        dst: commentAddress(2, 5),
        who: users.amethyst,
      },
    ]);
    // Make it very clear that the duplicate reference is, in fact, duplicated.
    // (`expectReferences` would locally pass even if the reference were not
    // duplicated. The suite would still fail because we compare lengths at the
    // end, but having this test makes the failure much easier to see.)
    it("the same reference can be created multiple times", () => {
      const duplicateReference = {
        src: commentAddress(2, 4),
        dst: commentAddress(2, 5),
        who: users.amethyst,
      };
      const relationalView = exampleRelationalView();
      const allMentionsAuthorReferences = Array.from(
        findMentionsAuthorReferences(relationalView)
      );
      const matching = allMentionsAuthorReferences.filter((x) =>
        deepEqual(x, duplicateReference)
      );
      expect(matching).toHaveLength(2);
    });

    const pullAddress = {repo, type: N.PULL_TYPE, number: "3"};
    // Verify that we check pulls too
    expectReferences("pull:3", [
      {
        src: pullAddress,
        dst: pullAddress,
        who: users.steven,
      },
    ]);
    // Finally, we verify that every reference has been accounted for.
    it("has no unexpected references", () => {
      const actualMentionsAuthorReferences = Array.from(
        findMentionsAuthorReferences(exampleRelationalView())
      );
      for (const actualRef of actualMentionsAuthorReferences) {
        expect(expectedMentionsAuthorReferences).toContainEqual(actualRef);
      }
      expect(actualMentionsAuthorReferences).toHaveLength(
        expectedMentionsAuthorReferences.length
      );
    });
  });
});