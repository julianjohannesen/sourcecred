# Overview

SourceCred is a cryptoeconomic mechanism for funding and incentivizing open-source development. The goal of SourceCred is to create a funding model for open-source projects that rewards contributors, and an incentive system that welcome more people to work on the project.

SourceCred allows any project to create *cred* (Ͼ), which is a cryptographic token representing work done in that project. Every project has its own, particular cred - for example, PythonϾ and EthereumϾ would be two totally separate creds. Each project creates cred via Cred Allocations, which are periodic events when cred is given to people that contributed to the project. That cred is allocated based on community feedback, where users with more cred have more weight, a la [PageRank](https://en.wikipedia.org/wiki/PageRank). The exact mechanics are up to each project, although SourceCred will suggest good norms and useful tools. One such norm is that every project should give 20% of its cred to the other projects that it depends on, so as to support and reward shared infrastructure.

When an existing project starts using SourceCred, they will have an Initial Cred Allocation (ICA), which determines how to retroactively give cred to the people that developed that project. This is just a special case of the standard cred allocation process. SourceCred will provide tools that scan the history of the project, and suggest a starting point for the allocation, but ultimately the allocation is decided by the community.

Each project's cred will be a implemented as an [ERC20 token](https://theethereum.wiki/w/index.php/ERC20_Token_Standard) on Ethereum. That means that contributors can use the Ethereum infrastructure to buy and sell cred. One reason that others would want to buy cred is to have influence over the project. For example, consider a business that depends on an open-source project, and needs it to add some new features and fix bugs. If that business buys cred in the project, they can influence the Cred Allocations - e.g. to ensure that people that work on their priorities get a lot of cred. That would be more efficient than having their engineers try to fix the project directly.