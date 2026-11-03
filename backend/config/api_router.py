"""Single registry for every authenticated REST resource."""

from rest_framework.routers import DefaultRouter

from apps.accounts.views import UserViewSet
from apps.catalog.views import (
    ServiceCategoryViewSet,
    ServiceImageViewSet,
    ServiceMaterialViewSet,
    ServiceViewSet,
    SolutionViewSet,
)
from apps.crm.views import CommunicationViewSet, ContractViewSet, CustomerViewSet, EnquiryViewSet
from apps.inventory.views import (
    EquipmentViewSet,
    MaterialCategoryViewSet,
    MaterialViewSet,
    ProductionOrderViewSet,
    ProductViewSet,
    StockMovementViewSet,
)
from apps.projects.views import (
    ProjectDocumentViewSet,
    ProjectExpenseViewSet,
    ProjectMilestoneViewSet,
    ProjectPaymentViewSet,
    ProjectPhotoViewSet,
    ProjectViewSet,
)
from apps.quotes.views import QuotationItemViewSet, QuotationViewSet
from apps.staff.views import EmployeeViewSet, TeamViewSet

router = DefaultRouter()

router.register("users", UserViewSet, basename="user")

router.register("staff/employees", EmployeeViewSet, basename="employee")
router.register("staff/teams", TeamViewSet, basename="team")

router.register("catalog/categories", ServiceCategoryViewSet, basename="servicecategory")
router.register("catalog/services", ServiceViewSet, basename="service")
router.register("catalog/service-images", ServiceImageViewSet, basename="serviceimage")
router.register("catalog/service-materials", ServiceMaterialViewSet, basename="servicematerial")
router.register("catalog/solutions", SolutionViewSet, basename="solution")

router.register("inventory/categories", MaterialCategoryViewSet, basename="materialcategory")
router.register("inventory/materials", MaterialViewSet, basename="material")
router.register("inventory/movements", StockMovementViewSet, basename="stockmovement")
router.register("inventory/products", ProductViewSet, basename="product")
router.register("inventory/production-orders", ProductionOrderViewSet, basename="productionorder")
router.register("inventory/equipment", EquipmentViewSet, basename="equipment")

router.register("crm/customers", CustomerViewSet, basename="customer")
router.register("crm/enquiries", EnquiryViewSet, basename="enquiry")
router.register("crm/communications", CommunicationViewSet, basename="communication")
router.register("crm/contracts", ContractViewSet, basename="contract")

router.register("projects", ProjectViewSet, basename="project")
router.register("project-photos", ProjectPhotoViewSet, basename="projectphoto")
router.register("project-documents", ProjectDocumentViewSet, basename="projectdocument")
router.register("project-expenses", ProjectExpenseViewSet, basename="projectexpense")
router.register("project-payments", ProjectPaymentViewSet, basename="projectpayment")
router.register("project-milestones", ProjectMilestoneViewSet, basename="projectmilestone")

router.register("quotations", QuotationViewSet, basename="quotation")
router.register("quotation-items", QuotationItemViewSet, basename="quotationitem")
