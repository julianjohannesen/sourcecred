#!/bin/sh

# Disable these lint rules globally:
#   2034 = unused variable (used by sharness)
#   2016 = parameter expansion in single quotes
#   1004 = backslash-newline in single quotes
# shellcheck disable=SC2034,SC2016,SC1004
:

test_description='test snapshot integrity for sourcecred load'

export GIT_CONFIG_NOSYSTEM=1
export GIT_ATTR_NOSYSTEM=1

# shellcheck disable=SC1091
. ./sharness.sh

test_expect_success "environment and Node linking setup" '
    toplevel="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" &&
    snapshot_directory="${toplevel}/sharness/__snapshots__/example-github-load" &&
    if [ -z "${SOURCECRED_BIN}" ]; then
        printf >&2 "warn: missing environment variable SOURCECRED_BIN\n" &&
        printf >&2 "warn: using repository bin directory as fallback\n" &&
        export SOURCECRED_BIN="${toplevel}/bin"
    fi &&
    export NODE_PATH="${toplevel}/node_modules${NODE_PATH:+:${NODE_PATH}}" &&
    test_set_prereq SETUP
'

if [ -n "${SOURCECRED_GITHUB_TOKEN:-}" ]; then
    test_set_prereq HAVE_GITHUB_TOKEN
fi

test_expect_success EXPENSIVE,SETUP,HAVE_GITHUB_TOKEN \
    "should load sourcecred/example-github" '
    SOURCECRED_DIRECTORY=. node "${SOURCECRED_BIN}/sourcecred.js" \
        load sourcecred/example-github &&
    rm -rf cache &&
    test_set_prereq LOADED_GITHUB
'

if [ -n "${UPDATE_SNAPSHOT}" ]; then
    test_set_prereq UPDATE_SNAPSHOT
fi

test_expect_success LOADED_GITHUB,UPDATE_SNAPSHOT \
    "should update the snapshot" '
    rm -rf "$snapshot_directory" &&
    cp -r . "$snapshot_directory"
'

test_expect_success LOADED_GITHUB "should be identical to the snapshot" '
    diff -qr . "$snapshot_directory"
'

test_done

# vim: ft=sh
