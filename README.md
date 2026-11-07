# Collaborative Task Management

A collaborative task management app for organizing projects and coordinating work with your team. Create boards, arrange tasks into workflow sections that fit your process, and follow changes as they happen.

Boards can be connected to GitHub repositories, bringing task planning closer to the codebase. You can also run an AI agent on a task and review its progress and code changes.

## Features

- **Organize work:** Structure projects across organizations, boards, workflow sections, and tasks.
- **Collaborate live:** See board updates as teammates make changes.
- **Connect GitHub:** Associate a repository with a board so related project work is easy to find.
- **Use task agents:** Start an agent on a task, follow its progress, and review its code changes.

## Working with Boards

Use boards to give a project a shared place for its tasks and updates. Customize workflow sections to reflect how work moves through your team, and use tasks to keep individual pieces of work organized. Real-time updates help collaborators stay aligned without relying on a separate view of the board.

When a board is connected to a GitHub repository, tasks can be considered alongside the project code. For tasks assigned to an agent, review the reported progress and resulting code changes before deciding what to do next.

## Tech Stack

The frontend uses React and TypeScript. The stack also includes Bun, Express, PostgreSQL, Prisma, and WebSockets.

## Getting Started

### Prerequisites

- Bun
- Node.js 18 or later
- The local services and environment variables required by your configuration

### Install and run

Configure the environment variables for your local services, then install dependencies and start the development server:

```bash
bun install
bun dev
```

Use your local environment configuration to determine which services and variables are required. Once the development server is running, open the application using the address printed in the terminal.
