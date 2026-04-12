FROM docker.io/node:24.14-bookworm-slim

{% if cookiecutter.frontend_pipeline == 'Vite' -%}
WORKDIR /app/frontend

COPY ./frontend/package.json /app/frontend
{%- else %}
WORKDIR /app

COPY ./package.json /app
{%- endif %}

RUN npm install && npm cache clean --force

ENV PATH=./node_modules/.bin/:$PATH
