"""Django settings for the New House Modern platform.

Every deployment-specific value is read from the environment (or ``backend/.env``
for local development). See ``.env.example`` in the repository root.
"""

from datetime import timedelta
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
if (BASE_DIR / ".env").exists():
    environ.Env.read_env(BASE_DIR / ".env")

DEBUG = env.bool("DJANGO_DEBUG", default=False)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set when DJANGO_DEBUG is off.")
    SECRET_KEY = "django-insecure-local-development-only"

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1", "backend"])
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000", "http://localhost:3001"]
)
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:3000", "http://localhost:3001"]
)
CORS_ALLOW_CREDENTIALS = True

INSTALLED_APPS = [
    "modeltranslation",  # must precede django.contrib.admin
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    # Platform
    "apps.core",
    "apps.accounts",
    "apps.staff",
    "apps.catalog",
    "apps.inventory",
    "apps.crm",
    "apps.projects",
    "apps.quotes",
    "apps.dashboard",
    "apps.public",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # Activates the language from the Accept-Language header sent by the web and admin apps.
    "django.middleware.locale.LocaleMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL", default="postgres://localhost:5432/newhousemodern"),
}
DATABASES["default"]["CONN_MAX_AGE"] = env.int("DB_CONN_MAX_AGE", default=60)

CACHES = {"default": env.cache("CACHE_URL", default="locmemcache://")}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "ka"
LANGUAGES = [
    ("ka", "ქართული"),
    ("en", "English"),
    ("ru", "Русский"),
]
# locale/        our messages (makemessages writes here)
# locale_vendor/ Georgian for Django REST framework's built-in messages (DRF ships none)
LOCALE_PATHS = [BASE_DIR / "locale", BASE_DIR / "locale_vendor"]
TIME_ZONE = "Asia/Tbilisi"
USE_I18N = True
USE_TZ = True

# Content translations (services, categories, products…) are stored per language;
# an empty translation falls back to English, then Georgian, then Russian.
MODELTRANSLATION_DEFAULT_LANGUAGE = "ka"
MODELTRANSLATION_FALLBACK_LANGUAGES = {"default": ("en", "ka", "ru")}

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(env("MEDIA_ROOT", default=str(BASE_DIR / "media")))
# Contracts, project documents and receipts live here. It is never served
# directly; files are streamed through authenticated API endpoints.
PRIVATE_MEDIA_ROOT = Path(env("PRIVATE_MEDIA_ROOT", default=str(BASE_DIR / "private_media")))

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}

DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["apps.core.permissions.ModulePermission"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.exception_handler",
    "DEFAULT_THROTTLE_RATES": {
        "login": env("THROTTLE_LOGIN", default="10/min"),
        "enquiry": env("THROTTLE_ENQUIRY", default="10/hour"),
        "public": env("THROTTLE_PUBLIC", default="300/min"),
        # Each assistant question is a paid Claude API call.
        "assistant": env("THROTTLE_ASSISTANT", default="30/hour"),
    },
    "NUM_PROXIES": env.int("NUM_PROXIES", default=None),
    "COERCE_DECIMAL_TO_STRING": False,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=15)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# The refresh token never touches JavaScript: it lives in an httpOnly cookie
# scoped to the auth endpoints. The short-lived access token is kept in memory.
AUTH_REFRESH_COOKIE = {
    "name": "nhm_refresh",
    "path": "/api/auth/",
    "secure": env.bool("AUTH_COOKIE_SECURE", default=not DEBUG),
    "samesite": "Lax",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "New House Modern API",
    "DESCRIPTION": "REST API for the New House Modern website and business management platform.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    # Several models share field names like "status"; give each choice set its own name.
    "ENUM_NAME_OVERRIDES": {
        "ProjectStatusEnum": "apps.projects.models.Project.Status",
        "QuotationStatusEnum": "apps.quotes.models.Quotation.Status",
        "EnquiryStatusEnum": "apps.crm.models.Enquiry.Status",
        "CustomerStatusEnum": "apps.crm.models.Customer.Status",
        "ContractStatusEnum": "apps.crm.models.Contract.Status",
        "EmployeeStatusEnum": "apps.staff.models.Employee.Status",
        "ProductionStatusEnum": "apps.inventory.models.ProductionOrder.Status",
        "EquipmentStatusEnum": "apps.inventory.models.Equipment.Status",
        "MaterialUnitEnum": "apps.inventory.models.Unit",
        "ServiceUnitEnum": "apps.catalog.models.Service.Unit",
        "ProductCategoryEnum": "apps.inventory.models.Product.Category",
        "ExpenseCategoryEnum": "apps.projects.models.ProjectExpense.Category",
        "SolutionKindEnum": "apps.catalog.models.Solution.Kind",
        "CustomerKindEnum": "apps.crm.models.Customer.Kind",
        "EquipmentKindEnum": "apps.inventory.models.Equipment.Kind",
        "QuotationItemKindEnum": "apps.quotes.models.QuotationItem.Kind",
        "ProjectDocumentKindEnum": "apps.projects.models.ProjectDocument.Kind",
    },
}

PDF_FONT_REGULAR = env("PDF_FONT_REGULAR", default="")
PDF_FONT_BOLD = env("PDF_FONT_BOLD", default="")

# Website AI assistant (apps/public/assistant.py). It answers only from the public website
# content and stays switched off until an API key is set.
ANTHROPIC_API_KEY = env("ANTHROPIC_API_KEY", default="")
ASSISTANT_MODEL = env("ASSISTANT_MODEL", default="claude-opus-5-5")

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    # Enable both once the site is served over HTTPS (see .env.example).
    SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
    SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)
    SESSION_COOKIE_SECURE = env.bool("SECURE_COOKIES", default=True)
    CSRF_COOKIE_SECURE = env.bool("SECURE_COOKIES", default=True)
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", default="INFO")},
}








