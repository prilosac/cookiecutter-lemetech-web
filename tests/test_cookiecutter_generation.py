import glob  # noqa: EXE002
import os
import re
import sys
from collections.abc import Iterable
from pathlib import Path

import pytest
import tomllib

try:
    import sh
except (ImportError, ModuleNotFoundError):
    sh = None  # sh doesn't support Windows
import yaml
from binaryornot.check import is_binary
from cookiecutter.exceptions import FailedHookException
from cookiecutter.main import cookiecutter

PATTERN = r"{{(\s?cookiecutter)[.](.*?)}}"
RE_OBJ = re.compile(PATTERN)

if sys.platform.startswith("win"):
    pytest.skip("sh doesn't support windows", allow_module_level=True)
elif sys.platform.startswith("darwin") and os.getenv("CI"):
    pytest.skip("skipping slow macOS tests on CI", allow_module_level=True)

# Run auto-fixable styles checks - skipped on CI by default. These can be fixed
# automatically by running pre-commit after generation. However, they are tedious
# to fix in the template, so we don't insist too much on fixing them.
AUTOFIXABLE_STYLES = os.getenv("AUTOFIXABLE_STYLES") == "1"
auto_fixable = pytest.mark.skipif(not AUTOFIXABLE_STYLES, reason="auto-fixable")


@pytest.fixture
def context():
    return {
        "project_name": "My Test Project",
        "project_slug": "my_test_project",
        "author_name": "Test Author",
        "email": "test@example.com",
        "description": "A short description of the project.",
        "domain_name": "example.com",
        "version": "0.1.0",
        "timezone": "UTC",
    }


SUPPORTED_COMBINATIONS = [
    {"username_type": "username"},
    {"username_type": "email"},
    {"open_source_license": "MIT"},
    {"open_source_license": "BSD"},
    {"open_source_license": "GPLv3"},
    {"open_source_license": "Apache Software License 2.0"},
    {"open_source_license": "Not open source"},
    {"windows": "y"},
    {"windows": "n"},
    # Windows without Docker and with django-compressor
    {"windows": "y", "frontend_pipeline": "Django Compressor", "use_docker": "n"},
    {"editor": "None"},
    {"editor": "Neovim"},
    {"editor": "PyCharm"},
    {"editor": "VS Code"},
    {"use_docker": "y"},
    {"use_docker": "n"},
    {"postgresql_version": "18"},
    {"postgresql_version": "17"},
    {"postgresql_version": "16"},
    {"postgresql_version": "15"},
    {"postgresql_version": "14"},
    {"cloud_provider": "AWS", "use_whitenoise": "y"},
    {"cloud_provider": "AWS", "use_whitenoise": "n"},
    {"cloud_provider": "GCP", "use_whitenoise": "y", "mail_service": "Mailgun"},
    {"cloud_provider": "GCP", "use_whitenoise": "n", "mail_service": "Mailgun"},
    {"cloud_provider": "Azure", "use_whitenoise": "y", "mail_service": "Mailgun"},
    {"cloud_provider": "Azure", "use_whitenoise": "n", "mail_service": "Mailgun"},
    {"cloud_provider": "None", "use_whitenoise": "y", "mail_service": "Mailgun"},
    {"cloud_provider": "None", "use_whitenoise": "y", "mail_service": "Mailjet"},
    {"cloud_provider": "None", "use_whitenoise": "y", "mail_service": "Mandrill"},
    {"cloud_provider": "None", "use_whitenoise": "y", "mail_service": "Postmark"},
    {"cloud_provider": "None", "use_whitenoise": "y", "mail_service": "Sendgrid"},
    {"cloud_provider": "None", "use_whitenoise": "y", "mail_service": "Brevo"},
    {"cloud_provider": "None", "use_whitenoise": "y", "mail_service": "SparkPost"},
    {"cloud_provider": "None", "use_whitenoise": "y", "mail_service": "Other SMTP"},
    # Note: cloud_provider=None AND use_whitenoise=n is not supported
    {"cloud_provider": "AWS", "mail_service": "Mailgun"},
    {"cloud_provider": "AWS", "mail_service": "Amazon SES"},
    {"cloud_provider": "AWS", "mail_service": "Mailjet"},
    {"cloud_provider": "AWS", "mail_service": "Mandrill"},
    {"cloud_provider": "AWS", "mail_service": "Postmark"},
    {"cloud_provider": "AWS", "mail_service": "Sendgrid"},
    {"cloud_provider": "AWS", "mail_service": "Brevo"},
    {"cloud_provider": "AWS", "mail_service": "SparkPost"},
    {"cloud_provider": "AWS", "mail_service": "Other SMTP"},
    {"cloud_provider": "GCP", "mail_service": "Mailgun"},
    {"cloud_provider": "GCP", "mail_service": "Mailjet"},
    {"cloud_provider": "GCP", "mail_service": "Mandrill"},
    {"cloud_provider": "GCP", "mail_service": "Postmark"},
    {"cloud_provider": "GCP", "mail_service": "Sendgrid"},
    {"cloud_provider": "GCP", "mail_service": "Brevo"},
    {"cloud_provider": "GCP", "mail_service": "SparkPost"},
    {"cloud_provider": "GCP", "mail_service": "Other SMTP"},
    {"cloud_provider": "Azure", "mail_service": "Mailgun"},
    {"cloud_provider": "Azure", "mail_service": "Mailjet"},
    {"cloud_provider": "Azure", "mail_service": "Mandrill"},
    {"cloud_provider": "Azure", "mail_service": "Postmark"},
    {"cloud_provider": "Azure", "mail_service": "Sendgrid"},
    {"cloud_provider": "Azure", "mail_service": "Brevo"},
    {"cloud_provider": "Azure", "mail_service": "SparkPost"},
    {"cloud_provider": "Azure", "mail_service": "Other SMTP"},
    # Note: cloud_providers GCP, Azure, and None
    # with mail_service Amazon SES is not supported
    {"rest_api": "None"},
    {"rest_api": "DRF"},
    {"rest_api": "Django Ninja"},
    {"use_async": "y"},
    {"use_async": "n"},
    {"frontend_pipeline": "None"},
    {"frontend_pipeline": "Vite", "rest_api": "DRF"},
    {"frontend_pipeline": "Vite", "rest_api": "Django Ninja"},
    {"frontend_pipeline": "Django Compressor"},
    {"frontend_pipeline": "Gulp"},
    {"frontend_pipeline": "Webpack"},
    {"use_celery": "y"},
    {"use_celery": "n"},
    {"use_mailpit": "y"},
    {"use_mailpit": "n"},
    {"use_sentry": "y"},
    {"use_sentry": "n"},
    {"use_whitenoise": "y"},
    {"use_whitenoise": "n"},
    {"use_heroku": "y"},
    {"use_heroku": "n"},
    {"ci_tool": "None"},
    {"ci_tool": "Github"},
    {"ci_tool": "Travis"},
    {"ci_tool": "Gitlab"},
    {"ci_tool": "Drone"},
    {"keep_local_envs_in_vcs": "y"},
    {"keep_local_envs_in_vcs": "n"},
    {"debug": "y"},
    {"debug": "n"},
]

UNSUPPORTED_COMBINATIONS = [
    {"cloud_provider": "None", "use_whitenoise": "n"},
    {"cloud_provider": "GCP", "mail_service": "Amazon SES"},
    {"cloud_provider": "Azure", "mail_service": "Amazon SES"},
    {"cloud_provider": "None", "mail_service": "Amazon SES"},
    {"frontend_pipeline": "Vite"},
    {"frontend_pipeline": "Vite", "rest_api": "None"},
]


def _fixture_id(ctx):
    """Helper to get a user-friendly test name from the parametrized context."""
    return "-".join(f"{key}:{value}" for key, value in ctx.items())


def build_files_list(base_path: Path):
    """Build a list containing absolute paths to the generated files."""
    excluded_dirs = {".venv", "__pycache__"}

    f = []
    for dirpath, subdirs, files in base_path.walk():
        subdirs[:] = [d for d in subdirs if d not in excluded_dirs]

        f.extend(dirpath / file_path for file_path in files)
    return f


def check_paths(paths: Iterable[Path]):
    """Method to check all paths have correct substitutions."""
    # Assert that no match is found in any of the files
    for path in paths:
        if is_binary(str(path)):
            continue

        content = path.read_text()
        match = RE_OBJ.search(content)
        assert match is None, f"cookiecutter variable not replaced in {path}"


@pytest.mark.parametrize("context_override", SUPPORTED_COMBINATIONS, ids=_fixture_id)
def test_project_generation(cookies, context, context_override):
    """Test that project is generated and fully rendered."""

    result = cookies.bake(extra_context={**context, **context_override})
    assert result.exit_code == 0
    assert result.exception is None
    assert result.project_path.name == context["project_slug"]
    assert result.project_path.is_dir()

    paths = build_files_list(result.project_path)
    assert paths
    check_paths(paths)


@pytest.mark.parametrize("context_override", SUPPORTED_COMBINATIONS, ids=_fixture_id)
def test_ruff_check_passes(cookies, context_override):
    """Generated project should pass ruff check."""
    result = cookies.bake(extra_context=context_override)

    try:
        sh.ruff("check", ".", _cwd=str(result.project_path))
    except sh.ErrorReturnCode as e:
        pytest.fail(e.stdout.decode())


@auto_fixable
@pytest.mark.parametrize("context_override", SUPPORTED_COMBINATIONS, ids=_fixture_id)
def test_ruff_format_passes(cookies, context_override):
    """Check whether generated project passes ruff format."""
    result = cookies.bake(extra_context=context_override)

    try:
        sh.ruff(
            "format",
            ".",
            _cwd=str(result.project_path),
        )
    except sh.ErrorReturnCode as e:
        pytest.fail(e.stdout.decode())


@auto_fixable
@pytest.mark.parametrize("context_override", SUPPORTED_COMBINATIONS, ids=_fixture_id)
def test_django_upgrade_passes(cookies, context_override):
    """Check whether generated project passes django-upgrade."""
    result = cookies.bake(extra_context=context_override)

    python_files = [
        file_path.removeprefix(f"{result.project_path}/")
        for file_path in glob.glob(str(result.project_path / "**" / "*.py"), recursive=True)  # noqa: PTH207
    ]
    try:
        sh.django_upgrade(
            "--target-version",
            "5.0",
            *python_files,
            _cwd=str(result.project_path),
        )
    except sh.ErrorReturnCode as e:
        pytest.fail(e.stdout.decode())


@pytest.mark.parametrize("context_override", SUPPORTED_COMBINATIONS, ids=_fixture_id)
def test_djlint_lint_passes(cookies, context_override):
    """Check whether generated project passes djLint --lint."""
    result = cookies.bake(extra_context=context_override)

    autofixable_rules = "H014,T001"
    # TODO: remove T002 when fixed https://github.com/Riverside-Healthcare/djLint/issues/687
    ignored_rules = "H006,H030,H031,T002"
    try:
        sh.djlint(
            "--lint",
            "--ignore",
            f"{autofixable_rules},{ignored_rules}",
            ".",
            _cwd=str(result.project_path),
        )
    except sh.ErrorReturnCode as e:
        pytest.fail(e.stdout.decode())


@auto_fixable
@pytest.mark.parametrize("context_override", SUPPORTED_COMBINATIONS, ids=_fixture_id)
def test_djlint_check_passes(cookies, context_override):
    """Check whether generated project passes djLint --check."""
    result = cookies.bake(extra_context=context_override)

    try:
        sh.djlint("--check", ".", _cwd=str(result.project_path))
    except sh.ErrorReturnCode as e:
        pytest.fail(e.stdout.decode())


@pytest.mark.parametrize(
    ("use_docker", "expected_test_script"),
    [
        ("n", "uv run pytest"),
        ("y", "docker compose -f docker-compose.local.yml run django pytest"),
    ],
)
def test_travis_invokes_pytest(cookies, context, use_docker, expected_test_script):
    context.update({"ci_tool": "Travis", "use_docker": use_docker})
    result = cookies.bake(extra_context=context)

    assert result.exit_code == 0
    assert result.exception is None
    assert result.project_path.name == context["project_slug"]
    assert result.project_path.is_dir()

    with (result.project_path / ".travis.yml").open() as travis_yml:
        try:
            yml = yaml.safe_load(travis_yml)["jobs"]["include"]
            assert yml[0]["script"] == ["ruff check ."]
            assert yml[1]["script"] == [expected_test_script]
        except yaml.YAMLError as e:
            pytest.fail(str(e))


@pytest.mark.parametrize(
    ("use_docker", "expected_test_script"),
    [
        ("n", "uv run pytest"),
        ("y", "docker compose -f docker-compose.local.yml run django pytest"),
    ],
)
def test_gitlab_invokes_precommit_and_pytest(cookies, context, use_docker, expected_test_script):
    context.update({"ci_tool": "Gitlab", "use_docker": use_docker})
    result = cookies.bake(extra_context=context)

    assert result.exit_code == 0
    assert result.exception is None
    assert result.project_path.name == context["project_slug"]
    assert result.project_path.is_dir()

    with (result.project_path / ".gitlab-ci.yml").open() as gitlab_yml:
        try:
            gitlab_config = yaml.safe_load(gitlab_yml)
            assert gitlab_config["precommit"]["script"] == [
                "uv run pre-commit run --show-diff-on-failure --color=always --all-files",
            ]
            assert gitlab_config["pytest"]["script"] == [expected_test_script]
        except yaml.YAMLError as e:
            pytest.fail(e)


@pytest.mark.parametrize(
    ("use_docker", "expected_test_script"),
    [
        ("n", "uv run pytest"),
        ("y", "docker compose -f docker-compose.local.yml run django pytest"),
    ],
)
def test_github_invokes_linter_and_pytest(cookies, context, use_docker, expected_test_script):
    context.update({"ci_tool": "Github", "use_docker": use_docker})
    result = cookies.bake(extra_context=context)

    assert result.exit_code == 0
    assert result.exception is None
    assert result.project_path.name == context["project_slug"]
    assert result.project_path.is_dir()

    with (result.project_path / ".github" / "workflows" / "ci.yml").open() as github_yml:
        try:
            github_config = yaml.safe_load(github_yml)
            linter_present = False
            for action_step in github_config["jobs"]["linter"]["steps"]:
                if action_step.get("uses", "NA").startswith("pre-commit"):
                    linter_present = True
            assert linter_present

            expected_test_script_present = False
            for action_step in github_config["jobs"]["pytest"]["steps"]:
                if action_step.get("run") == expected_test_script:
                    expected_test_script_present = True
            assert expected_test_script_present
        except yaml.YAMLError as e:
            pytest.fail(e)


@pytest.mark.parametrize("slug", ["project slug", "Project_Slug"])
def test_invalid_slug(cookies, context, slug):
    """Invalid slug should fail pre-generation hook."""
    context.update({"project_slug": slug})

    result = cookies.bake(extra_context=context)

    assert result.exit_code != 0
    assert isinstance(result.exception, FailedHookException)


@pytest.mark.parametrize("invalid_context", UNSUPPORTED_COMBINATIONS)
def test_error_if_incompatible(cookies, context, invalid_context):
    """It should not generate project an incompatible combination is selected."""
    context.update(invalid_context)
    result = cookies.bake(extra_context=context)

    assert result.exit_code != 0
    assert isinstance(result.exception, FailedHookException)


@pytest.mark.parametrize(
    ("editor", "pycharm_docs_exist"),
    [
        ("None", False),
        ("PyCharm", True),
        ("VS Code", False),
        ("Neovim", False),
    ],
)
def test_pycharm_docs_removed(cookies, context, editor, pycharm_docs_exist):
    context.update({"editor": editor})
    result = cookies.bake(extra_context=context)

    index_rst = result.project_path / "docs" / "index.rst"
    has_pycharm_docs = "pycharm/configuration" in index_rst.read_text()
    assert has_pycharm_docs is pycharm_docs_exist


@pytest.mark.parametrize(
    ("editor", "vscode_customization_exists"),
    [
        ("None", False),
        ("PyCharm", False),
        ("VS Code", True),
        ("Neovim", False),
    ],
)
def test_vscode_devcontainer_customizations_removed(tmp_path, context, editor, vscode_customization_exists):
    context.update({"editor": editor, "use_docker": "y"})
    cookiecutters_dir = tmp_path / "cookiecutters"
    replay_dir = tmp_path / "cookiecutter_replay"
    cookiecutters_dir.mkdir()
    replay_dir.mkdir()
    config_file = tmp_path / "cookiecutter_config.yaml"
    config_file.write_text(
        yaml.safe_dump(
            {
                "cookiecutters_dir": str(cookiecutters_dir),
                "replay_dir": str(replay_dir),
            },
        ),
    )

    project_path = Path(
        cookiecutter(
            ".",
            no_input=True,
            extra_context=context,
            output_dir=str(tmp_path),
            config_file=str(config_file),
            accept_hooks=False,
        ),
    )

    devcontainer_json = project_path / ".devcontainer" / "devcontainer.json"
    has_vscode_customization = '"vscode"' in devcontainer_json.read_text()
    assert has_vscode_customization is vscode_customization_exists


def test_trim_domain_email(cookies, context):
    """Check that leading and trailing spaces are trimmed in domain and email."""
    context.update(
        {
            "use_docker": "y",
            "domain_name": "   example.com   ",
            "email": "  me@example.com  ",
        },
    )
    result = cookies.bake(extra_context=context)

    assert result.exit_code == 0

    prod_django_env = result.project_path / ".envs" / ".production" / ".django"
    assert "DJANGO_ALLOWED_HOSTS=.example.com" in prod_django_env.read_text()

    base_settings = result.project_path / "config" / "settings" / "base.py"
    assert "<me@example.com>" in base_settings.read_text()


def test_pyproject_toml(cookies, context):
    author_name = "Project Author"
    author_email = "me@example.com"
    context.update(
        {
            "description": "DESCRIPTION",
            "domain_name": "example.com",
            "email": author_email,
            "author_name": author_name,
        },
    )
    result = cookies.bake(extra_context=context)
    assert result.exit_code == 0

    pyproject_toml = result.project_path / "pyproject.toml"

    data = tomllib.loads(pyproject_toml.read_text())

    assert data
    assert data["project"]["authors"][0]["email"] == author_email
    assert data["project"]["authors"][0]["name"] == author_name
    assert data["project"]["name"] == context["project_slug"]


def test_vite_headless_auth_contract(cookies, context):
    context.update({"frontend_pipeline": "Vite", "rest_api": "DRF", "use_docker": "n"})
    result = cookies.bake(extra_context=context)

    assert result.exit_code == 0

    base_settings = (result.project_path / "config" / "settings" / "base.py").read_text()
    urls = (result.project_path / "config" / "urls.py").read_text()
    auth_views = (result.project_path / "config" / "auth_views.py").read_text()
    vite_config = (result.project_path / "frontend" / "vite.config.ts").read_text()
    auth_routing = (result.project_path / "frontend" / "src" / "auth-routing.ts").read_text()
    user_adapters = (result.project_path / context["project_slug"] / "users" / "adapters.py").read_text()
    router = (result.project_path / "frontend" / "src" / "router.tsx").read_text()
    root_route = result.project_path / "frontend" / "src" / "routes" / "__root.tsx"
    login_route = result.project_path / "frontend" / "src" / "routes" / "account" / "login.tsx"
    mfa_route = result.project_path / "frontend" / "src" / "routes" / "account" / "2fa.tsx"
    profile_route = result.project_path / "frontend" / "src" / "routes" / "account" / "profile.tsx"
    provider_callback_route = (
        result.project_path / "frontend" / "src" / "routes" / "account" / "provider" / "callback.tsx"
    )
    admin_tests = (result.project_path / context["project_slug"] / "users" / "tests" / "test_admin.py").read_text()
    generated_readme = (result.project_path / "README.md").read_text()

    assert '"allauth.headless"' in base_settings
    assert 'HEADLESS_CLIENTS = ("browser",)' in base_settings
    assert f'HEADLESS_ADAPTER = "{context["project_slug"]}.users.adapters.HeadlessAdapter"' in base_settings
    assert "HEADLESS_ONLY = True" in base_settings
    assert '"account_confirm_email": "/account/verify-email/{key}"' in base_settings
    assert 'LOGIN_URL = "account_login"' in base_settings

    assert 'path("accounts/bootstrap/", spa_auth_bootstrap_view, name="account_spa_bootstrap")' in urls
    assert 'path("accounts/login/", account_login_redirect_view, name="account_login")' in urls
    assert 'path("_allauth/", include("allauth.headless.urls"))' in urls
    assert 'r"^(?!admin/|api/|accounts/|_allauth/|media/|static/|__debug__/).+$"' in urls

    assert "class SPAAuthBootstrapView(View):" in auth_views
    assert '"csrf_token": get_token(request)' in auth_views

    assert "'/accounts': {" in vite_config
    assert "'/_allauth': {" in vite_config
    assert "export function hasFlow" in auth_routing

    assert root_route.exists()
    assert login_route.exists()
    assert profile_route.exists()
    assert "class HeadlessAdapter(DefaultHeadlessAdapter):" in user_adapters
    assert 'payload["is_superuser"] = user.is_superuser' in user_adapters
    assert "createRootRoute" in root_route.read_text()
    assert 'to="/account/profile"' in root_route.read_text()
    assert 'href="/admin/"' not in root_route.read_text()
    assert "createFileRoute('/account/login')" in login_route.read_text()
    assert "createFileRoute('/account/2fa')" in mfa_route.read_text()
    assert "createFileRoute('/account/profile')" in profile_route.read_text()
    assert "auth.user?.is_superuser" in profile_route.read_text()
    assert "QRCodeSVG" in profile_route.read_text()
    assert "hasFlow(response, 'reauthenticate')" in profile_route.read_text()
    assert "createFileRoute('/account/provider/callback')" in provider_callback_route.read_text()
    assert "import { routeTree } from './routeTree.gen';" in router
    assert "createRouter({ routeTree })" in router
    assert "path: '/account/login'" not in router

    assert "def test_allauth_login" in admin_tests
    assert "SPA auth surface backed by `allauth.headless`" in generated_readme
    assert "intentionally left for a follow-up change" not in generated_readme


def test_pre_commit_without_heroku(cookies, context):
    context.update({"use_heroku": "n"})
    result = cookies.bake(extra_context=context)
    assert result.exit_code == 0

    pre_commit_config = result.project_path / ".pre-commit-config.yaml"

    data = pre_commit_config.read_text()

    assert "uv-pre-commit" not in data
