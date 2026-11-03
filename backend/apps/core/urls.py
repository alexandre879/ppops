from django.urls import path

from apps.quotes.views import PricingSettingsView

from .views import SiteSettingsView

urlpatterns = [
    path("site/", SiteSettingsView.as_view(), name="site-settings"),
    path("pricing/", PricingSettingsView.as_view(), name="pricing-settings"),
]
