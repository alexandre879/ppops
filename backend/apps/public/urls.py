from django.urls import path

from . import views

urlpatterns = [
    path("site/", views.SiteView.as_view(), name="public-site"),
    path("categories/", views.CategoryListView.as_view(), name="public-categories"),
    path("services/", views.ServiceListView.as_view(), name="public-services"),
    path("services/<slug:slug>/", views.ServiceDetailView.as_view(), name="public-service-detail"),
    path("solutions/", views.SolutionListView.as_view(), name="public-solutions"),
    path("projects/", views.ProjectListView.as_view(), name="public-projects"),
    path("projects/<slug:slug>/", views.ProjectDetailView.as_view(), name="public-project-detail"),
    path("products/", views.ProductListView.as_view(), name="public-products"),
    path("enquiries/", views.EnquiryCreateView.as_view(), name="public-enquiry"),
    path("assistant/", views.AssistantView.as_view(), name="public-assistant"),
]
