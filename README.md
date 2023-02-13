# PMC Code Review Bot

# Atlas TTD UID2 API

---

## Getting started

---

### Pre-requisites

1. [Node.JS and NPM](https://nodejs.org/)
1. [git](https://git-scm.com/)
1. [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm#installing-and-updating)
2. mysql/mariadb

### Environment Setup

To get needed repositories and applications:

1. Clone the following repos in the directory where you want the project to live (use code snippet below):
    * [code-review-bot](https://github.com/penske-media-corp/code-review-bot)
    ```
    git clone git@github.com:penske-media-corp/code-review-bot.git
    ```
1. Go into the code-review-bot directory (ie. `cd code-review-bot`).  All instructions below will assume that you are in this directory.
1. Copy `.env.example` to `.env` and edit the API & Secret key variable. 
    * Make sure the mysql/mariadb service is up and running.
2. Install the nodejs packages & setup the database schemas for the first time:
    ```
    nvm install && npm run dev-once
    ```
1. Start the local development environment
      ```
      npm run dev
      ``` 
