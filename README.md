# Cookiecutter Leme Tech Web

[![Build Status](https://img.shields.io/github/actions/workflow/status/cookiecutter/cookiecutter-django/ci.yml?branch=main)](https://github.com/cookiecutter/cookiecutter-django/actions/workflows/ci.yml?query=branch%3Amain)
[![Documentation Status](https://readthedocs.org/projects/cookiecutter-django/badge/?version=latest)](https://cookiecutter-django.readthedocs.io/en/latest/?badge=latest)
[![pre-commit.ci status](https://results.pre-commit.ci/badge/github/cookiecutter/cookiecutter-django/main.svg)](https://results.pre-commit.ci/latest/github/cookiecutter/cookiecutter-django/main)
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/ambv/black)

[![Updates](https://pyup.io/repos/github/cookiecutter/cookiecutter-django/shield.svg)](https://pyup.io/repos/github/cookiecutter/cookiecutter-django/)
[![Code Helpers Badge](https://www.codetriage.com/cookiecutter/cookiecutter-django/badges/users.svg)](https://www.codetriage.com/cookiecutter/cookiecutter-django)

Powered by [Cookiecutter](https://github.com/cookiecutter/cookiecutter), Cookiecutter Leme Tech Web is a framework for jumpstarting
production-ready Django projects quickly.

- Documentation: <https://cookiecutter-django.readthedocs.io/en/latest/>
- See [Troubleshooting](https://cookiecutter-django.readthedocs.io/en/latest/5-help/troubleshooting.html) for common errors and obstacles
- If you have problems with Cookiecutter Django, please open [issues](https://github.com/cookiecutter/cookiecutter-django/issues/new) don't send
  emails to the maintainers.

## Features

- For Django 6.0
- Works with Python 3.14
- Renders Django projects with 100% starting test coverage
- Twitter [Bootstrap](https://github.com/twbs/bootstrap) v5
- [12-Factor](https://12factor.net) based settings via [django-environ](https://github.com/joke2k/django-environ)
- Secure by default. We believe in SSL.
- Optimized development and production settings
- Registration via [django-allauth](https://github.com/pennersr/django-allauth)
- Comes with custom user model ready to go
- Optional basic ASGI setup for Websockets
- Optional frontend pipelines including Vite, Gulp, and Webpack
- Send emails via [Anymail](https://github.com/anymail/django-anymail) (using [Mailgun](http://www.mailgun.com/) by default or Amazon SES if AWS is selected cloud provider, but switchable)
- Media storage using Amazon S3, Google Cloud Storage, Azure Storage or nginx
- Docker support using [docker-compose](https://github.com/docker/compose) for development and production (using [Traefik](https://traefik.io/) with [LetsEncrypt](https://letsencrypt.org/) support)
- [Procfile](https://devcenter.heroku.com/articles/procfile) for deploying to Heroku
- Instructions for deploying to [PythonAnywhere](https://www.pythonanywhere.com/)
- Run tests with unittest or pytest
- Customizable PostgreSQL version
- Default integration with [pre-commit](https://github.com/pre-commit/pre-commit) for identifying simple issues before submission to code review

## Optional Integrations

_These features can be enabled during initial project setup._

- Serve static files from Amazon S3, Google Cloud Storage, Azure Storage or [Whitenoise](https://whitenoise.readthedocs.io/)
- Configuration for [Celery](https://docs.celeryq.dev) and [Flower](https://github.com/mher/flower) (the latter in Docker setup only)
- Integration with [Mailpit](https://github.com/axllent/mailpit/) for local email testing
- Integration with [Sentry](https://sentry.io/welcome/) for error logging

## Constraints

- Only maintained 3rd party libraries are used.
- Uses PostgreSQL everywhere: 14 - 18 ([MySQL fork](https://github.com/mabdullahadeel/cookiecutter-django-mysql) also available).
- Environment variables for configuration (This won't work with Apache/mod_wsgi).

## Usage

Let's pretend you want to create a Django project called "redditclone". Rather than using `startproject`
and then editing the results to include your name, email, and various configuration issues that always get forgotten until the worst possible moment, get [cookiecutter](https://github.com/cookiecutter/cookiecutter) to do all the work.

First, get Cookiecutter. Trust me, it's awesome:

    uv tool install "cookiecutter>=1.7.0"

Now run it against this repo:

    uvx cookiecutter https://github.com/cookiecutter/cookiecutter-django

You'll be prompted for some values. Provide them, then a Django project will be created for you.

**Warning**: After this point, change 'Lucas Teixeira', 'prilosac', etc to your own information.

Answer the prompts with your own desired [options](http://cookiecutter-django.readthedocs.io/en/latest/1-getting-started/project-generation-options.html). For example:

    Cloning into 'cookiecutter-lemetech-web'...
    remote: Counting objects: 550, done.
    remote: Compressing objects: 100% (310/310), done.
    remote: Total 550 (delta 283), reused 479 (delta 222)
    Receiving objects: 100% (550/550), 127.66 KiB | 58 KiB/s, done.
    Resolving deltas: 100% (283/283), done.
    [1/27] project_name (Leme Tech Project):
    [2/27] project_slug (leme_tech_project):
    [3/27] description (Leme Tech Project):
    [4/27] author_name (Lucas Teixeira):
    [5/27] domain_name (lemete.ch):
    [6/27] email (lucas-teixeira@lemete.ch):
    [7/27] version (0.1.0):
    [8/27] Select open_source_license
      1 - MIT
      2 - BSD
      3 - GPLv3
      4 - Apache Software License 2.0
      5 - Not open source
      Choose from [1/2/3/4/5] (1):
    [9/27] Select username_type
      1 - email
      2 - username
      Choose from [1/2] (1):
    [10/27] timezone (UTC):
    [11/27] windows (n):
    [12/27] Select editor
      1 - Neovim
      2 - VS Code
      3 - PyCharm
      4 - None
      Choose from [1/2/3/4] (1):
    [13/27] use_docker (y):
    [14/27] Select postgresql_version
      1 - 18
      2 - 17
      3 - 16
      4 - 15
      5 - 14
      Choose from [1/2/3/4/5] (1):
    [15/27] Select cloud_provider
      1 - AWS
      2 - GCP
      3 - Azure
      4 - None
      Choose from [1/2/3/4] (1):
    [16/27] Select mail_service
      1 - Amazon SES
      2 - Mailgun
      3 - Mailjet
      4 - Mandrill
      5 - Postmark
      6 - Sendgrid
      7 - Brevo
      8 - SparkPost
      9 - Other SMTP
      Choose from [1/2/3/4/5/6/7/8/9] (1):
    [17/27] Select rest_api
      1 - DRF
      2 - Django Ninja
      3 - None
      Choose from [1/2/3] (1):
    [18/27] use_async (y):
    [19/27] Select frontend_pipeline
      1 - Vite
      2 - Django Compressor
      3 - Gulp
      4 - Webpack
      5 - None
      Choose from [1/2/3/4/5] (1):
    [20/27] use_celery (y):
    [21/27] use_mailpit (y):
    [22/27] use_sentry (y):
    [23/27] use_whitenoise (y):
    [24/27] use_heroku (n):
    [25/27] Select ci_tool
      1 - Github
      2 - Travis
      3 - Gitlab
      4 - Drone
      5 - None
      Choose from [1/2/3/4/5] (1):
    [26/27] keep_local_envs_in_vcs (y):
    [27/27] debug (n):


Enter the project and take a look around:

    cd reddit/
    ls

Create a git repo and push it there:

    git init
    git add .
    git commit -m "first awesome commit"
    git remote add origin git@github.com:pydanny/redditclone.git
    git push -u origin main

Now take a look at your repo. Don't forget to carefully look at the generated README. If you selected Vite, your React + TypeScript frontend will live in ``frontend/``. Awesome, right?

For local development, see the following:

- [Developing locally](https://cookiecutter-django.readthedocs.io/en/latest/2-local-development/developing-locally.html)
- [Developing locally using docker](https://cookiecutter-django.readthedocs.io/en/latest/2-local-development/developing-locally-docker.html)

## Community

- Have questions? **Before you ask questions anywhere else**, please post your question on [Stack Overflow](http://stackoverflow.com/questions/tagged/cookiecutter-django) under the _cookiecutter-django_ tag. We check there periodically for questions.
- If you think you found a bug or want to request a feature, please open an [issue](https://github.com/cookiecutter/cookiecutter-django/issues).
- For anything else, you can chat with us on [Discord](https://discord.gg/uFXweDQc5a).

<img src="https://opencollective.com/cookiecutter-django/contributors.svg?width=890&button=false" alt="Contributors">

## For Readers of Two Scoops of Django

You may notice that some elements of this project do not exactly match what we describe in chapter 3. The reason for that is this project, amongst other things, serves as a test bed for trying out new ideas and concepts. Sometimes they work, sometimes they don't, but the end result is that it won't necessarily match precisely what is described in the book I co-authored.

## For PyUp Users

If you are using [PyUp](https://pyup.io) to keep your dependencies updated and secure, use the code _cookiecutter_ during checkout to get 15% off every month.

## "Your Stuff"

Scattered throughout the Python and HTML of this project are places marked with "your stuff". This is where third-party libraries are to be integrated with your project.

## For MySQL users

To get full MySQL support in addition to the default Postgresql, you can use this fork of the cookiecutter-django:
https://github.com/mabdullahadeel/cookiecutter-django-mysql

## Releases

Need a stable release? You can find them at <https://github.com/prilosac/cookiecutter-lemetech-web/releases>

## Not Exactly What You Want?

This is what I want. _It might not be what you want._ Don't worry, you have options:

### Fork This

If you have differences in your preferred setup, I encourage you to fork this to create your own version.

### Submit a Pull Request

We accept pull requests if they're small, atomic, 
and make our own project development experience better.

## Articles

- [Why cookiecutter-django is Essential for Your Next Django Project](https://medium.com/@millsks/why-cookiecutter-django-is-essential-for-your-next-django-project-7d3c00cdce51) - Aug. 4, 2024
- [How to Make Your Own Django Cookiecutter Template!](https://medium.com/@FatemeFouladkar/how-to-make-your-own-django-cookiecutter-template-a753d4cbb8c2) - Aug. 10, 2023
- [Cookiecutter Django With Amazon RDS](https://haseeburrehman.com/posts/cookiecutter-django-with-amazon-rds/) - Apr, 2, 2021
- [Complete Walkthrough: Blue/Green Deployment to AWS ECS using GitHub actions](https://github.com/Andrew-Chen-Wang/cookiecutter-django-ecs-github) - June 10, 2020
- [Using cookiecutter-django with Google Cloud Storage](https://ahhda.github.io/cloud/gce/django/2019/03/12/using-django-cookiecutter-cloud-storage.html) - Mar. 12, 2019
- [cookiecutter-django with Nginx, Route 53 and ELB](https://msaizar.com/blog/cookiecutter-django-nginx-route-53-and-elb/) - Feb. 12, 2018
- [cookiecutter-django and Amazon RDS](https://msaizar.com/blog/cookiecutter-django-and-amazon-rds/) - Feb. 7, 2018
- [Using Cookiecutter to Jumpstart a Django Project on Windows with PyCharm](https://joshuahunter.com/posts/using-cookiecutter-to-jumpstart-a-django-project-on-windows-with-pycharm/) - May 19, 2017
- [Exploring with Cookiecutter](http://www.snowboardingcoder.com/django/2016/12/03/exploring-with-cookiecutter/) - Dec. 3, 2016
- [Introduction to Cookiecutter-Django](http://krzysztofzuraw.com/blog/2016/django-cookiecutter.html) - Feb. 19, 2016
- [Django and GitLab - Running Continuous Integration and tests with your FREE account](http://dezoito.github.io/2016/05/11/django-gitlab-continuous-integration-phantomjs.html) - May. 11, 2016
- [Development and Deployment of Cookiecutter-Django on Fedora](https://realpython.com/blog/python/development-and-deployment-of-cookiecutter-django-on-fedora/) - Jan. 18, 2016
- [Development and Deployment of Cookiecutter-Django via Docker](https://realpython.com/blog/python/development-and-deployment-of-cookiecutter-django-via-docker/) - Dec. 29, 2015
- [How to create a Django Application using Cookiecutter and Django 1.8](https://www.swapps.io/blog/how-to-create-a-django-application-using-cookiecutter-and-django-1-8/) - Sept. 12, 2015

Have a blog or online publication? Write about your cookiecutter-django tips and tricks, then send us a pull request with the link.
