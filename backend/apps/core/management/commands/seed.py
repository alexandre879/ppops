"""Load New House Modern's company content, and optionally demo business data.

    python manage.py seed            # company profile, services, materials, products, admin user
    python manage.py seed --demo     # + sample customers, projects, quotes, stock (local/demo only!)

Content is provided in Georgian, English and Russian. The command is safe to run
on every start: it only creates what is missing and never overwrites edits made
in the admin platform.
"""

import os
import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone, translation
from django.utils.text import slugify

from apps.accounts.models import User
from apps.accounts.roles import Role
from apps.catalog.models import Service, ServiceCategory, ServiceMaterial, Solution
from apps.core.models import SiteSettings
from apps.crm.models import Communication, Contract, Customer, Enquiry
from apps.inventory.models import Equipment, Material, MaterialCategory, Product, ProductionOrder
from apps.inventory.services import record_movement
from apps.projects.models import Project, ProjectExpense, ProjectMilestone, ProjectPayment
from apps.quotes.models import PricingSettings, Quotation
from apps.quotes.services import add_estimate_to_quotation
from apps.staff.models import Employee, Team

D = Decimal
LANGS = ("en", "ka", "ru")


def tr(field: str, en, ka, ru) -> dict:
    """``tr("name", "Stone", "ქვა", "Камень")`` → ``{"name_en": …, "name_ka": …, "name_ru": …}``."""
    return {f"{field}_en": en, f"{field}_ka": ka, f"{field}_ru": ru}


# ---------------------------------------------------------------------------
# Company content (from the New House Modern company profile)
# ---------------------------------------------------------------------------

SITE_TEXT = {
    "tagline": (
        "Façades, cladding, decorative finishes and in-house manufacturing",
        "ფასადები, მოპირკეთება, დეკორატიული საფარები და საკუთარი წარმოება",
        "Фасады, облицовка, декоративные покрытия и собственное производство",
    ),
    "hero_title": (
        "Modern façades and construction solutions, built to last",
        "თანამედროვე ფასადები და გამძლე სამშენებლო გადაწყვეტები",
        "Современные фасады и строительные решения на долгие годы",
    ),
    "hero_subtitle": (
        "Façade plastering, modern cladding, energy-efficient insulation, decorative finishes, custom furniture "
        "and our own European-standard scaffolding and formwork — delivered by qualified teams, at fair prices "
        "and within agreed deadlines.",
        "ფასადის შელესვა, თანამედროვე მოპირკეთება, ენერგოეფექტური თბოიზოლაცია, დეკორატიული საფარები, "
        "ინდივიდუალური ავეჯი და ჩვენი საკუთარი, ევროპული სტანდარტის ხარაჩოები და ყალიბები — კვალიფიციური "
        "ბრიგადებით, სამართლიან ფასად და შეთანხმებულ ვადებში.",
        "Штукатурка фасадов, современная облицовка, энергоэффективное утепление, декоративные покрытия, мебель "
        "на заказ и собственные леса и опалубка европейского стандарта — силами квалифицированных бригад, по "
        "честным ценам и в согласованные сроки.",
    ),
    "about_text": (
        "New House Modern is a construction and renovation company specialising in façade plastering, modern "
        "exterior and interior cladding, energy-efficient insulation systems, painting, furniture manufacturing "
        "and metal construction systems. We deliver professional construction and renovation services using "
        "modern technologies, high-quality materials and qualified teams, and undertake projects of varying "
        "complexity — including buildings of different heights and architectural designs.",
        "New House Modern არის სამშენებლო და სარემონტო კომპანია, რომელიც სპეციალიზირებულია ფასადების "
        "შელესვაზე, თანამედროვე გარე და შიდა მოპირკეთებაზე, ენერგოეფექტურ თბოიზოლაციის სისტემებზე, "
        "შეღებვაზე, ავეჯის წარმოებასა და ლითონის სამშენებლო სისტემებზე. ჩვენ ვასრულებთ პროფესიონალურ "
        "სამშენებლო და სარემონტო სამუშაოებს თანამედროვე ტექნოლოგიებით, მაღალი ხარისხის მასალებითა და "
        "კვალიფიციური ბრიგადებით და ვახორციელებთ სხვადასხვა სირთულის პროექტებს — მათ შორის სხვადასხვა "
        "სიმაღლისა და არქიტექტურის შენობებზე.",
        "New House Modern — строительно-ремонтная компания, специализирующаяся на штукатурке фасадов, "
        "современной наружной и внутренней облицовке, энергоэффективных системах утепления, покраске, "
        "производстве мебели и металлических строительных системах. Мы выполняем профессиональные строительные "
        "и ремонтные работы с использованием современных технологий, качественных материалов и "
        "квалифицированных бригад и реализуем проекты любой сложности — включая здания разной этажности и "
        "архитектуры.",
    ),
    "mission": (
        "To provide high-quality workmanship, modern architectural solutions, competitive pricing and reliable "
        "project delivery within agreed deadlines.",
        "მაღალი ხარისხის სამუშაო, თანამედროვე არქიტექტურული გადაწყვეტები, კონკურენტული ფასები და "
        "პროექტების საიმედოდ ჩაბარება შეთანხმებულ ვადებში.",
        "Высокое качество работ, современные архитектурные решения, конкурентные цены и надёжная сдача "
        "проектов в согласованные сроки.",
    ),
    "promise": (
        "Save time and receive high-quality construction services at reasonable prices and within agreed deadlines.",
        "დაზოგეთ დრო და მიიღეთ მაღალი ხარისხის სამშენებლო მომსახურება გონივრულ ფასად და შეთანხმებულ ვადებში.",
        "Экономьте время и получайте качественные строительные услуги по разумным ценам и в согласованные сроки.",
    ),
}

PRICING_TERMS = (
    "Prices are valid for the period stated above. Works start after the advance payment agreed in the "
    "contract. Additional works not listed in this quotation are priced separately. Material quantities are "
    "estimated and settled against actual measurements.",
    "ფასები მოქმედებს ზემოთ მითითებული ვადის განმავლობაში. სამუშაოები იწყება ხელშეკრულებით შეთანხმებული "
    "წინასწარი გადახდის შემდეგ. ამ შეთავაზებაში ჩაუთვლელი დამატებითი სამუშაოები ფასდება ცალკე. მასალების "
    "რაოდენობა შეფასებულია და დაზუსტდება ფაქტობრივი აზომვების მიხედვით.",
    "Цены действительны в течение указанного выше срока. Работы начинаются после предоплаты, согласованной в "
    "договоре. Дополнительные работы, не указанные в предложении, оцениваются отдельно. Количество материалов "
    "рассчитано ориентировочно и уточняется по фактическим замерам.",
)

# slug, icon, (name en/ka/ru), (description en/ka/ru)
CATEGORIES = [
    ("facade-plastering", "building",
     ("Façade Plastering & Finishing", "ფასადის შელესვა და მოპირკეთება", "Штукатурка и отделка фасадов"),
     ("Professional façade plastering using both traditional and modern techniques — from sand and cement plaster "
      "to energy-efficient insulation systems, surface preparation and painting.",
      "ფასადების პროფესიონალური შელესვა ტრადიციული და თანამედროვე მეთოდებით — ქვიშა-ცემენტის ბათქაშიდან "
      "ენერგოეფექტურ თბოიზოლაციის სისტემებამდე, ზედაპირის მომზადება და შეღებვა.",
      "Профессиональная штукатурка фасадов традиционными и современными методами — от цементно-песчаной "
      "штукатурки до энергоэффективных систем утепления, подготовки поверхностей и покраски.")),
    ("cladding", "layers",
     ("Exterior & Interior Cladding", "გარე და შიდა მოპირკეთება", "Наружная и внутренняя облицовка"),
     ("Modern, high-performance cladding panels for exterior and interior applications, offering extensive design "
      "possibilities for contemporary architecture.",
      "თანამედროვე, მაღალი ხარისხის მოსაპირკეთებელი პანელები გარე და შიდა სამუშაოებისთვის — დიზაინის ფართო "
      "შესაძლებლობებით თანამედროვე არქიტექტურისთვის.",
      "Современные высококачественные облицовочные панели для наружных и внутренних работ с широкими "
      "дизайнерскими возможностями для современной архитектуры.")),
    ("decorative-finishes", "brush",
     ("Decorative Finishes & Textures", "დეკორატიული საფარები და ტექსტურები", "Декоративные покрытия и фактуры"),
     ("Specialised fillers, decorative materials and application techniques that create a wide variety of "
      "architectural textures and finishes.",
      "სპეციალური შემავსებლები, დეკორატიული მასალები და დატანის ტექნიკები, რომლებიც ქმნის მრავალფეროვან "
      "არქიტექტურულ ტექსტურებსა და საფარებს.",
      "Специальные шпатлёвки, декоративные материалы и техники нанесения, создающие широкий выбор "
      "архитектурных фактур и покрытий.")),
    ("renovation", "hammer",
     ("Construction & Renovation", "მშენებლობა და რემონტი", "Строительство и ремонт"),
     ("Qualified, experienced teams for renovation, façade installation, finishing works and specialised "
      "construction solutions of any complexity.",
      "კვალიფიციური და გამოცდილი ბრიგადები რემონტისთვის, ფასადის მონტაჟისთვის, მოსაპირკეთებელი სამუშაოებისა "
      "და ნებისმიერი სირთულის სპეციალიზებული სამშენებლო გადაწყვეტებისთვის.",
      "Квалифицированные и опытные бригады для ремонта, монтажа фасадов, отделочных работ и "
      "специализированных строительных решений любой сложности.")),
    ("furniture", "sofa",
     ("Custom Furniture", "ინდივიდუალური ავეჯი", "Мебель на заказ"),
     ("A complete furniture service — from initial design and planning through to production and final delivery.",
      "ავეჯის სრული სერვისი — საწყისი დიზაინიდან და დაგეგმვიდან წარმოებამდე და მიწოდებამდე.",
      "Полный цикл изготовления мебели — от дизайна и планирования до производства и доставки.")),
    ("manufacturing", "factory",
     ("Scaffolding & Metal Systems", "ხარაჩოები და ლითონის სისტემები", "Леса и металлоконструкции"),
     ("Our own manufacturing facility produces façade scaffolding, metal formwork, safety railings and metal "
      "staircases in accordance with European standards.",
      "ჩვენს საწარმოში ევროპული სტანდარტების შესაბამისად მზადდება ფასადის ხარაჩოები, ლითონის ყალიბები, "
      "დამცავი მოაჯირები და ლითონის კიბეები.",
      "На собственном производстве мы изготавливаем фасадные леса, металлическую опалубку, защитные "
      "ограждения и металлические лестницы в соответствии с европейскими стандартами.")),
]

# kind, (name en/ka/ru)
SOLUTIONS = [
    ("cladding", ("Ventilated façade cladding panels", "ვენტილირებადი ფასადის პანელები", "Панели для вентилируемых фасадов")),
    ("cladding", ("Aluminium composite panels (ACP)", "ალუმინის კომპოზიტური პანელები (ACP)", "Алюминиевые композитные панели (АКП)")),
    ("cladding", ("Compact laminate panels", "კომპაქტ-ლამინატის პანელები", "Панели из компакт-ламината")),
    ("cladding", ("Hekimboard fibre-cement boards", "Hekimboard ფიბროცემენტის ფილები", "Фиброцементные плиты Hekimboard")),
    ("insulation", ("Expanded polystyrene (EPS) insulation boards", "პენოპლასტის (EPS) თბოსაიზოლაციო ფილები", "Утеплитель из пенополистирола (EPS)")),
    ("stone", ("Natural stone cladding", "ბუნებრივი ქვით მოპირკეთება", "Облицовка натуральным камнем")),
    ("stone", ("Artificial stone cladding", "ხელოვნური ქვით მოპირკეთება", "Облицовка искусственным камнем")),
    ("plaster", ("Sand and cement plaster", "ქვიშა-ცემენტის ბათქაში", "Цементно-песчаная штукатурка")),
    ("decorative", ("Venetian plaster", "ვენეციური ბათქაში", "Венецианская штукатурка")),
    ("decorative", ("Munich-style textured plaster", "მიუნხენური ტექსტურული ბათქაში", "Фактурная штукатурка «Мюнхен»")),
    ("decorative", ("Spanish-style decorative finish", "ესპანური დეკორატიული საფარი", "Декоративное покрытие «Испанка»")),
    ("decorative", ("Splatter and textured plaster effects", "შხეფისა და ტექსტურული ბათქაშის ეფექტები", "Эффекты набрызга и фактурной штукатурки")),
    ("decorative", ("Scratched and structured surfaces", "ნაკაწრი და სტრუქტურული ზედაპირები", "Рельефные и структурные поверхности")),
    ("decorative", ("Decorative brick-effect finish", "აგურის იმიტაციის დეკორატიული საფარი", "Декоративная отделка под кирпич")),
    ("decorative", ("Travertine stone-effect finish", "ტრავერტინის იმიტაცია", "Отделка под травертин")),
    ("decorative", ("Custom stencil patterns", "ინდივიდუალური ტრაფარეტული ორნამენტები", "Индивидуальные узоры по трафарету")),
]

# (name en/ka/ru); materials below refer to them by the English name
MATERIAL_CATEGORIES = [
    ("Plaster & mortars", "ბათქაში და ხსნარები", "Штукатурки и растворы"),
    ("Insulation", "თბოიზოლაცია", "Утеплители"),
    ("Cladding panels", "მოსაპირკეთებელი პანელები", "Облицовочные панели"),
    ("Paints & primers", "საღებავები და გრუნტები", "Краски и грунтовки"),
    ("Decorative finishes", "დეკორატიული საფარები", "Декоративные покрытия"),
    ("Stone & tiles", "ქვა და ფილები", "Камень и плитка"),
    ("Substructure & fixings", "ქვესისტემა და სამაგრები", "Подсистема и крепёж"),
    ("Mesh & accessories", "ბადეები და აქსესუარები", "Сетки и комплектующие"),
]

# sku, (name en/ka/ru), category, unit, unit cost (GEL, placeholder — update to real supplier prices), stock, min
MATERIALS = [
    ("PLS-001", ("Cement-sand plaster mix, 25 kg", "ქვიშა-ცემენტის ბათქაშის ნარევი, 25 კგ", "Цементно-песчаная штукатурная смесь, 25 кг"), "Plaster & mortars", "bag", "9.50", 240, 60),
    ("PLS-002", ("Tile & stone adhesive, 25 kg", "ფილისა და ქვის წებო, 25 კგ", "Клей для плитки и камня, 25 кг"), "Plaster & mortars", "bag", "18.00", 80, 20),
    ("PLS-003", ("ETICS adhesive & base coat, 25 kg", "თბოიზოლაციის წებო და ბაზისური ფენა, 25 კგ", "Клей и базовый слой для СФТК, 25 кг"), "Plaster & mortars", "bag", "22.00", 120, 40),
    ("PLS-004", ("Finishing putty, 20 kg", "მოსაპირკეთებელი ფითხი, 20 კგ", "Финишная шпатлёвка, 20 кг"), "Plaster & mortars", "bag", "28.00", 45, 15),
    ("INS-001", ("EPS façade insulation board, 50 mm", "ფასადის პენოპლასტი (EPS), 50 მმ", "Фасадный пенополистирол (EPS), 50 мм"), "Insulation", "m2", "9.00", 600, 150),
    ("INS-002", ("Mineral wool façade slab, 50 mm", "ფასადის მინერალური ბამბა, 50 მმ", "Фасадная минеральная вата, 50 мм"), "Insulation", "m2", "16.00", 180, 60),
    ("INS-003", ("Windproof façade membrane", "ქარდამცავი ფასადის მემბრანა", "Ветрозащитная фасадная мембрана"), "Insulation", "m2", "3.20", 400, 100),
    ("CLD-001", ("Aluminium composite panel 4 mm, 1.22×4.0 m", "ალუმინის კომპოზიტური პანელი 4 მმ, 1.22×4.0 მ", "Алюминиевая композитная панель 4 мм, 1,22×4,0 м"), "Cladding panels", "sheet", "260.00", 36, 10),
    ("CLD-002", ("Compact laminate panel 8 mm", "კომპაქტ-ლამინატის პანელი 8 მმ", "Панель компакт-ламинат 8 мм"), "Cladding panels", "m2", "145.00", 40, 15),
    ("CLD-003", ("Hekimboard fibre-cement board 10 mm, 1.2×2.5 m", "Hekimboard ფიბროცემენტის ფილა 10 მმ, 1.2×2.5 მ", "Фиброцементная плита Hekimboard 10 мм, 1,2×2,5 м"), "Cladding panels", "sheet", "68.00", 30, 12),
    ("PNT-001", ("Deep-penetrating primer", "ღრმად შეღწევადი გრუნტი", "Грунтовка глубокого проникновения"), "Paints & primers", "l", "4.50", 300, 60),
    ("PNT-002", ("Silicone façade paint", "სილიკონის ფასადის საღებავი", "Силиконовая фасадная краска"), "Paints & primers", "l", "14.00", 160, 40),
    ("DEC-001", ("Decorative textured plaster, 25 kg", "დეკორატიული ტექსტურული ბათქაში, 25 კგ", "Декоративная фактурная штукатурка, 25 кг"), "Decorative finishes", "bag", "55.00", 60, 15),
    ("DEC-002", ("Venetian plaster", "ვენეციური ბათქაში", "Венецианская штукатурка"), "Decorative finishes", "kg", "18.00", 90, 25),
    ("DEC-003", ("Protective decorative wax", "დამცავი დეკორატიული ცვილი", "Защитный декоративный воск"), "Decorative finishes", "l", "35.00", 12, 4),
    ("STN-001", ("Natural stone cladding tiles", "ბუნებრივი ქვის მოსაპირკეთებელი ფილები", "Облицовочная плитка из натурального камня"), "Stone & tiles", "m2", "75.00", 25, 10),
    ("STN-002", ("Artificial stone cladding tiles", "ხელოვნური ქვის მოსაპირკეთებელი ფილები", "Облицовочная плитка из искусственного камня"), "Stone & tiles", "m2", "42.00", 70, 20),
    ("STN-003", ("Joint grout", "ნაკერების შემავსებელი", "Затирка для швов"), "Stone & tiles", "kg", "2.80", 150, 40),
    ("FIX-001", ("Aluminium substructure profile", "ალუმინის ქვესისტემის პროფილი", "Алюминиевый профиль подсистемы"), "Substructure & fixings", "m", "9.80", 900, 250),
    ("FIX-002", ("Aluminium wall bracket", "ალუმინის კედლის კრონშტეინი", "Алюминиевый стеновой кронштейн"), "Substructure & fixings", "pcs", "4.20", 700, 200),
    ("FIX-003", ("Insulation anchor (façade dowel)", "თბოიზოლაციის დიუბელი", "Фасадный дюбель для утеплителя"), "Substructure & fixings", "pcs", "0.45", 2500, 800),
    ("FIX-004", ("Façade fixings set (rivets & screws, 100 pcs)", "ფასადის სამაგრების კომპლექტი (100 ც)", "Комплект фасадного крепежа (100 шт.)"), "Substructure & fixings", "set", "38.00", 30, 10),
    ("MSH-001", ("Fibreglass reinforcing mesh", "მინაბოჭკოვანი გამაგრების ბადე", "Армирующая стеклосетка"), "Mesh & accessories", "m2", "2.10", 800, 200),
    ("MSH-002", ("Corner bead with mesh", "კუთხის პროფილი ბადით", "Угловой профиль с сеткой"), "Mesh & accessories", "m", "2.40", 300, 80),
]

# category, (title en/ka/ru), (summary en/ka/ru), unit, labour h/unit, solutions (EN names),
# (features en/ka/ru), recipe [(sku, consumption, waste%)]
SERVICES = [
    ("facade-plastering",
     ("Sand & cement façade plastering", "ფასადის ქვიშა-ცემენტით შელესვა", "Цементно-песчаная штукатурка фасадов"),
     ("Durable traditional plastering for façades and interiors, prepared for painting or decorative finishes.",
      "გამძლე ტრადიციული შელესვა ფასადებისა და ინტერიერისთვის, მომზადებული შეღებვის ან დეკორატიული საფარისთვის.",
      "Прочная традиционная штукатурка фасадов и интерьеров, подготовленная под покраску или декоративную отделку."),
     "m2", "0.55", ["Sand and cement plaster"],
     (["Exterior and interior surface preparation", "Reinforcing mesh and corner protection", "Level, crack-resistant base for finishing"],
      ["გარე და შიდა ზედაპირების მომზადება", "გამაგრების ბადე და კუთხეების დაცვა", "სწორი, ბზარმედეგი საფუძველი მოპირკეთებისთვის"],
      ["Подготовка наружных и внутренних поверхностей", "Армирующая сетка и защита углов", "Ровное, трещиностойкое основание под отделку"]),
     [("PLS-001", "0.72", 5), ("MSH-001", "1.00", 10), ("MSH-002", "0.15", 10), ("PNT-001", "0.15", 5)]),
    ("facade-plastering",
     ("Energy-efficient insulation systems", "ენერგოეფექტური თბოიზოლაციის სისტემები", "Энергоэффективные системы утепления"),
     ("External thermal insulation (ETICS) that cuts heating and cooling costs and protects the structure.",
      "ფასადის გარე თბოიზოლაცია (ETICS), რომელიც ამცირებს გათბობისა და გაგრილების ხარჯებს და იცავს კონსტრუქციას.",
      "Наружное утепление фасадов (СФТК), которое снижает расходы на отопление и охлаждение и защищает конструкцию."),
     "m2", "1.10", ["Expanded polystyrene (EPS) insulation boards"],
     (["EPS insulation boards with mechanical anchoring", "Reinforced base coat", "Decorative top coat in any colour"],
      ["პენოპლასტის ფილები მექანიკური დამაგრებით", "გამაგრებული ბაზისური ფენა", "ნებისმიერი ფერის დეკორატიული საფარი"],
      ["Плиты EPS с механическим креплением", "Армированный базовый слой", "Декоративный финишный слой любого цвета"]),
     [("INS-001", "1.00", 5), ("PLS-003", "0.36", 5), ("FIX-003", "6", 3), ("MSH-001", "1.00", 10), ("PNT-001", "0.20", 5), ("DEC-001", "0.12", 5)]),
    ("facade-plastering",
     ("Surface preparation", "ზედაპირის მომზადება", "Подготовка поверхностей"),
     ("Priming, levelling and putty work that gives every finish a flawless, long-lasting base.",
      "გრუნტვა, გასწორება და ფითხის სამუშაოები — უნაკლო და ხანგრძლივი საფუძველი ნებისმიერი საფარისთვის.",
      "Грунтовка, выравнивание и шпатлёвка — безупречное и долговечное основание для любой отделки."),
     "m2", "0.30", [],
     (["Cleaning and priming", "Putty levelling", "Interior and exterior surfaces"],
      ["გაწმენდა და გრუნტვა", "ფითხით გასწორება", "შიდა და გარე ზედაპირები"],
      ["Очистка и грунтовка", "Выравнивание шпатлёвкой", "Внутренние и наружные поверхности"]),
     [("PNT-001", "0.20", 5), ("PLS-004", "0.08", 5)]),
    ("facade-plastering",
     ("Professional façade painting", "ფასადის პროფესიონალური შეღებვა", "Профессиональная покраска фасадов"),
     ("High-quality façade painting with weather-resistant silicone paints.",
      "ფასადის მაღალი ხარისხის შეღებვა ამინდგამძლე სილიკონის საღებავებით.",
      "Качественная покраска фасадов атмосферостойкими силиконовыми красками."),
     "m2", "0.20", [],
     (["Two-coat application", "Weather- and UV-resistant paints", "Any colour on request"],
      ["ორფენიანი დატანა", "ამინდისა და ულტრაიისფერი სხივების მიმართ მდგრადი საღებავები", "ნებისმიერი ფერი მოთხოვნით"],
      ["Нанесение в два слоя", "Краски, стойкие к погоде и УФ-излучению", "Любой цвет по запросу"]),
     [("PNT-001", "0.15", 5), ("PNT-002", "0.35", 5)]),
    ("cladding",
     ("Ventilated façade systems", "ვენტილირებადი ფასადის სისტემები", "Системы вентилируемых фасадов"),
     ("Rain-screen façades with an aluminium substructure, insulation and a ventilated cavity behind the panels.",
      "ვენტილირებადი ფასადები ალუმინის ქვესისტემით, თბოიზოლაციით და პანელების უკან სავენტილაციო ღრეჩოთი.",
      "Навесные вентилируемые фасады с алюминиевой подсистемой, утеплителем и вентилируемым зазором за панелями."),
     "m2", "1.30", ["Ventilated façade cladding panels"],
     (["Aluminium substructure and brackets", "Mineral wool insulation and membrane", "Compatible with ACP, compact laminate, fibre-cement and stone"],
      ["ალუმინის ქვესისტემა და კრონშტეინები", "მინერალური ბამბის თბოიზოლაცია და მემბრანა", "თავსებადია ACP-თან, კომპაქტ-ლამინატთან, ფიბროცემენტთან და ქვასთან"],
      ["Алюминиевая подсистема и кронштейны", "Утеплитель из минваты и мембрана", "Подходит для АКП, компакт-ламината, фиброцемента и камня"]),
     [("FIX-001", "2.40", 5), ("FIX-002", "2.20", 5), ("INS-002", "1.00", 5), ("INS-003", "1.05", 5), ("FIX-004", "0.12", 5)]),
    ("cladding",
     ("Aluminium composite panel (ACP) cladding", "ალუმინის კომპოზიტური პანელებით (ACP) მოპირკეთება", "Облицовка алюминиевыми композитными панелями (АКП)"),
     ("Lightweight, precise ACP façades in a wide range of colours and finishes.",
      "მსუბუქი და ზუსტი ACP ფასადები ფერებისა და ფაქტურების ფართო არჩევანით.",
      "Лёгкие и точные фасады из АКП в широкой гамме цветов и фактур."),
     "m2", "1.20", ["Aluminium composite panels (ACP)", "Ventilated façade cladding panels"],
     (["Factory-cut cassette panels", "Wide colour range", "Low maintenance"],
      ["ქარხნულად დაჭრილი კასეტური პანელები", "ფერების ფართო არჩევანი", "მარტივი მოვლა"],
      ["Кассеты заводского раскроя", "Широкая цветовая гамма", "Простой уход"]),
     [("CLD-001", "0.205", 10), ("FIX-001", "2.20", 5), ("FIX-002", "2.00", 5), ("FIX-004", "0.15", 5)]),
    ("cladding",
     ("Compact laminate cladding", "კომპაქტ-ლამინატით მოპირკეთება", "Облицовка компакт-ламинатом"),
     ("Impact- and weather-resistant compact laminate panels for façades and interiors.",
      "დარტყმისა და ამინდის მიმართ მდგრადი კომპაქტ-ლამინატის პანელები ფასადებისა და ინტერიერისთვის.",
      "Ударо- и атмосферостойкие панели из компакт-ламината для фасадов и интерьеров."),
     "m2", "1.10", ["Compact laminate panels"],
     (["Exterior and interior applications", "Wood, stone and solid-colour décors", "Highly durable surface"],
      ["გარე და შიდა გამოყენება", "ხის, ქვის და ერთფეროვანი დეკორები", "უაღრესად გამძლე ზედაპირი"],
      ["Для наружных и внутренних работ", "Декоры под дерево, камень и однотонные", "Особо прочная поверхность"]),
     [("CLD-002", "1.00", 8), ("FIX-001", "2.20", 5), ("FIX-002", "2.00", 5), ("FIX-004", "0.15", 5)]),
    ("cladding",
     ("Hekimboard fibre-cement cladding", "Hekimboard ფიბროცემენტით მოპირკეთება", "Облицовка фиброцементом Hekimboard"),
     ("Fire-resistant fibre-cement boards for robust, modern façades.",
      "ცეცხლგამძლე ფიბროცემენტის ფილები მყარი, თანამედროვე ფასადებისთვის.",
      "Огнестойкие фиброцементные плиты для прочных современных фасадов."),
     "m2", "0.90", ["Hekimboard fibre-cement boards"],
     (["Non-combustible boards", "Paintable and textured options", "Suitable for wet areas"],
      ["არაწვადი ფილები", "შესაღები და ტექსტურული ვარიანტები", "შესაფერისია ნესტიანი ზონებისთვის"],
      ["Негорючие плиты", "Варианты под покраску и с фактурой", "Подходят для влажных зон"]),
     [("CLD-003", "0.334", 8), ("FIX-001", "2.00", 5), ("FIX-004", "0.18", 5)]),
    ("cladding",
     ("Natural & artificial stone cladding", "ბუნებრივი და ხელოვნური ქვით მოპირკეთება", "Облицовка натуральным и искусственным камнем"),
     ("Timeless stone façades and feature walls in natural or artificial stone.",
      "კლასიკური ქვის ფასადები და აქცენტური კედლები ბუნებრივი ან ხელოვნური ქვით.",
      "Классические каменные фасады и акцентные стены из натурального или искусственного камня."),
     "m2", "1.40", ["Natural stone cladding", "Artificial stone cladding"],
     (["Natural and artificial stone", "Exterior façades and interior feature walls", "Professional jointing"],
      ["ბუნებრივი და ხელოვნური ქვა", "გარე ფასადები და შიდა აქცენტური კედლები", "ნაკერების პროფესიონალური დამუშავება"],
      ["Натуральный и искусственный камень", "Фасады и акцентные стены в интерьере", "Профессиональная расшивка швов"]),
     [("STN-002", "1.00", 8), ("PLS-002", "0.24", 5), ("STN-003", "0.60", 5)]),
    ("decorative-finishes",
     ("Venetian plaster", "ვენეციური ბათქაში", "Венецианская штукатурка"),
     ("Polished, marble-like Venetian plaster for elegant interiors.",
      "გაპრიალებული, მარმარილოს მსგავსი ვენეციური ბათქაში ელეგანტური ინტერიერისთვის.",
      "Полированная венецианская штукатурка с эффектом мрамора для элегантных интерьеров."),
     "m2", "1.20", ["Venetian plaster"],
     (["Multi-layer polished finish", "Protective wax coating", "Custom colours"],
      ["მრავალფენიანი გაპრიალებული საფარი", "დამცავი ცვილის ფენა", "ინდივიდუალური ფერები"],
      ["Многослойное полированное покрытие", "Защитный слой воска", "Индивидуальные цвета"]),
     [("PNT-001", "0.15", 5), ("DEC-002", "0.45", 5), ("DEC-003", "0.05", 5)]),
    ("decorative-finishes",
     ("Textured decorative plaster", "ტექსტურული დეკორატიული ბათქაში", "Фактурная декоративная штукатурка"),
     ("Munich-style, Spanish-style, splatter, scratched and structured textures for façades and interiors.",
      "მიუნხენური, ესპანური, შხეფის, ნაკაწრი და სტრუქტურული ტექსტურები ფასადებისა და ინტერიერისთვის.",
      "Фактуры «Мюнхен», «Испанка», набрызг, рельефные и структурные поверхности для фасадов и интерьеров."),
     "m2", "0.50",
     ["Munich-style textured plaster", "Spanish-style decorative finish", "Splatter and textured plaster effects", "Scratched and structured surfaces"],
     (["Munich-style textured plaster", "Spanish-style decorative finishes", "Splatter, scratched and structured effects"],
      ["მიუნხენური ტექსტურული ბათქაში", "ესპანური დეკორატიული საფარები", "შხეფის, ნაკაწრი და სტრუქტურული ეფექტები"],
      ["Фактурная штукатурка «Мюнхен»", "Декоративные покрытия «Испанка»", "Эффекты набрызга, рельефа и структуры"]),
     [("PNT-001", "0.15", 5), ("DEC-001", "0.12", 5)]),
    ("decorative-finishes",
     ("Travertine & brick-effect finishes", "ტრავერტინისა და აგურის იმიტაცია", "Отделка под травертин и кирпич"),
     ("Realistic travertine stone and decorative brick effects created with specialised techniques.",
      "ტრავერტინის ქვისა და დეკორატიული აგურის რეალისტური ეფექტები სპეციალური ტექნიკით.",
      "Реалистичные эффекты травертина и декоративного кирпича, созданные специальными техниками."),
     "m2", "0.90", ["Travertine stone-effect finish", "Decorative brick-effect finish"],
     (["Travertine stone-effect finishes", "Decorative brick-effect finishes", "Exterior and interior use"],
      ["ტრავერტინის იმიტაცია", "აგურის დეკორატიული იმიტაცია", "გარე და შიდა გამოყენება"],
      ["Отделка под травертин", "Декоративная отделка под кирпич", "Для фасадов и интерьеров"]),
     [("PNT-001", "0.15", 5), ("DEC-001", "0.20", 5)]),
    ("decorative-finishes",
     ("Custom stencil patterns", "ინდივიდუალური ტრაფარეტული ორნამენტები", "Индивидуальные узоры по трафарету"),
     ("Unique decorative patterns created with specialised templates and stencils.",
      "უნიკალური დეკორატიული ორნამენტები სპეციალური შაბლონებითა და ტრაფარეტებით.",
      "Уникальные декоративные узоры, созданные с помощью специальных шаблонов и трафаретов."),
     "m2", "1.00", ["Custom stencil patterns"],
     (["Individual designs", "Templates and stencils", "Interior feature surfaces"],
      ["ინდივიდუალური დიზაინი", "შაბლონები და ტრაფარეტები", "ინტერიერის აქცენტური ზედაპირები"],
      ["Индивидуальный дизайн", "Шаблоны и трафареты", "Акцентные поверхности в интерьере"]),
     [("PNT-001", "0.15", 5), ("DEC-001", "0.10", 5)]),
    ("renovation",
     ("Interior & exterior renovation", "შიდა და გარე რემონტი", "Внутренний и наружный ремонт"),
     ("Complete renovation works delivered by our own qualified construction teams.",
      "სარემონტო სამუშაოების სრული ციკლი ჩვენი კვალიფიციური სამშენებლო ბრიგადების მიერ.",
      "Полный комплекс ремонтных работ силами наших квалифицированных бригад."),
     "project", "0", [],
     (["Project planning and supervision", "Finishing works", "Attention to safety and detail"],
      ["პროექტის დაგეგმვა და ზედამხედველობა", "მოსაპირკეთებელი სამუშაოები", "უსაფრთხოებასა და დეტალებზე ყურადღება"],
      ["Планирование и технический надзор", "Отделочные работы", "Внимание к безопасности и деталям"]),
     []),
    ("renovation",
     ("Façade installation & finishing works", "ფასადის მონტაჟი და მოსაპირკეთებელი სამუშაოები", "Монтаж фасадов и отделочные работы"),
     ("Façade installation and specialised finishing for buildings of different heights and designs.",
      "ფასადის მონტაჟი და სპეციალიზებული მოპირკეთება სხვადასხვა სიმაღლისა და დიზაინის შენობებისთვის.",
      "Монтаж фасадов и специализированная отделка зданий разной этажности и архитектуры."),
     "project", "0", [],
     (["Buildings of any height", "Own scaffolding and equipment", "Reliable deadlines"],
      ["ნებისმიერი სიმაღლის შენობები", "საკუთარი ხარაჩოები და ტექნიკა", "საიმედო ვადები"],
      ["Здания любой этажности", "Собственные леса и техника", "Надёжные сроки"]),
     []),
    ("furniture",
     ("Custom furniture design & manufacturing", "ავეჯის ინდივიდუალური დიზაინი და დამზადება", "Дизайн и изготовление мебели на заказ"),
     ("Individually designed furniture, manufactured in our workshop and delivered to your space.",
      "ინდივიდუალური დიზაინის ავეჯი, დამზადებული ჩვენს სახელოსნოში და მიწოდებული თქვენთან.",
      "Мебель по индивидуальному дизайну, изготовленная в нашей мастерской и доставленная к вам."),
     "project", "0", [],
     (["Custom furniture design", "Individual project planning", "Design-to-production service"],
      ["ავეჯის ინდივიდუალური დიზაინი", "პროექტის ინდივიდუალური დაგეგმვა", "სრული ციკლი — დიზაინიდან წარმოებამდე"],
      ["Индивидуальный дизайн мебели", "Индивидуальное планирование проекта", "Полный цикл — от дизайна до производства"]),
     []),
    ("furniture",
     ("Built-in interior solutions", "ჩაშენებული ინტერიერის გადაწყვეტები", "Встроенные интерьерные решения"),
     ("Made-to-measure kitchens, wardrobes and built-in interior elements.",
      "ზომაზე დამზადებული სამზარეულოები, კარადები და ჩაშენებული ინტერიერის ელემენტები.",
      "Кухни, шкафы и встроенные элементы интерьера по индивидуальным размерам."),
     "m", "0", [],
     (["Kitchens and wardrobes", "Built-in storage", "Precise made-to-measure production"],
      ["სამზარეულოები და კარადები", "ჩაშენებული შესანახი სივრცე", "ზუსტი ზომებით წარმოება"],
      ["Кухни и шкафы", "Встроенные системы хранения", "Точное изготовление по размерам"]),
     []),
    ("manufacturing",
     ("Façade scaffolding systems", "ფასადის ხარაჩოების სისტემები", "Системы фасадных лесов"),
     ("Different types of façade scaffolding produced in our own facility to European standards.",
      "სხვადასხვა ტიპის ფასადის ხარაჩოები, დამზადებული ჩვენს საწარმოში ევროპული სტანდარტებით.",
      "Фасадные леса разных типов, изготовленные на нашем производстве по европейским стандартам."),
     "m2", "0", [],
     (["Manufactured in-house", "European-standard production", "Supply for projects of any height"],
      ["საკუთარი წარმოება", "ევროპული სტანდარტით დამზადება", "მიწოდება ნებისმიერი სიმაღლის პროექტებისთვის"],
      ["Собственное производство", "Изготовление по европейским стандартам", "Поставка для объектов любой высоты"]),
     []),
    ("manufacturing",
     ("Metal formwork systems", "ლითონის ყალიბების სისტემები", "Системы металлической опалубки"),
     ("Column, diaphragm wall, beam, structural and slab formwork for efficient concrete works.",
      "სვეტების, დიაფრაგმული კედლების, კოჭების, კონსტრუქციული და გადახურვის ყალიბები ეფექტური ბეტონის სამუშაოებისთვის.",
      "Опалубка колонн, стен-диафрагм, балок, конструкций и перекрытий для эффективных бетонных работ."),
     "project", "0", [],
     (["Column formwork", "Diaphragm wall formwork", "Beam, structural and slab formwork"],
      ["სვეტების ყალიბები", "დიაფრაგმული კედლების ყალიბები", "კოჭების, კონსტრუქციული და გადახურვის ყალიბები"],
      ["Опалубка колонн", "Опалубка стен-диафрагм", "Опалубка балок, конструкций и перекрытий"]),
     []),
    ("manufacturing",
     ("Safety railings & metal staircases", "დამცავი მოაჯირები და ლითონის კიბეები", "Защитные ограждения и металлические лестницы"),
     ("Protective metal safety railings and metal staircases manufactured to order.",
      "ლითონის დამცავი მოაჯირები და ლითონის კიბეები შეკვეთით.",
      "Защитные металлические ограждения и металлические лестницы на заказ."),
     "m", "0", [],
     (["Protective safety railings", "Metal staircases", "Made to order"],
      ["დამცავი მოაჯირები", "ლითონის კიბეები", "დამზადება შეკვეთით"],
      ["Защитные ограждения", "Металлические лестницы", "Изготовление на заказ"]),
     []),
]

FEATURED = {"Energy-efficient insulation systems", "Ventilated façade systems", "Venetian plaster", "Façade scaffolding systems"}

STANDARD = ("Manufactured to European standards", "დამზადებულია ევროპული სტანდარტებით", "Изготовлено по европейским стандартам")

# sku, category, (name en/ka/ru), (description en/ka/ru)
PRODUCTS = [
    ("SCF-001", "scaffolding",
     ("Façade scaffolding systems", "ფასადის ხარაჩოების სისტემები", "Системы фасадных лесов"),
     ("Different types of façade scaffolding for safe work on buildings of any height.",
      "სხვადასხვა ტიპის ფასადის ხარაჩოები ნებისმიერი სიმაღლის შენობებზე უსაფრთხო მუშაობისთვის.",
      "Фасадные леса разных типов для безопасной работы на зданиях любой высоты.")),
    ("FRM-001", "formwork",
     ("Metal formwork systems", "ლითონის ყალიბების სისტემები", "Системы металлической опалубки"),
     ("Reusable metal formwork systems for fast, accurate concrete works.",
      "მრავალჯერადი ლითონის ყალიბები სწრაფი და ზუსტი ბეტონის სამუშაოებისთვის.",
      "Многоразовая металлическая опалубка для быстрых и точных бетонных работ.")),
    ("FRM-002", "formwork",
     ("Column formwork", "სვეტების ყალიბი", "Опалубка колонн"),
     ("Formwork structures for rectangular and round columns.",
      "ყალიბები მართკუთხა და მრგვალი სვეტებისთვის.",
      "Опалубка для прямоугольных и круглых колонн.")),
    ("FRM-003", "formwork",
     ("Diaphragm wall formwork", "დიაფრაგმული კედლების ყალიბი", "Опалубка стен-диафрагм"),
     ("Formwork systems for diaphragm and retaining walls.",
      "ყალიბის სისტემები დიაფრაგმული და საყრდენი კედლებისთვის.",
      "Опалубочные системы для стен-диафрагм и подпорных стен.")),
    ("FRM-004", "formwork",
     ("Beam & structural formwork", "კოჭებისა და კონსტრუქციების ყალიბი", "Опалубка балок и конструкций"),
     ("Formwork for beams and structural elements.",
      "ყალიბები კოჭებისა და კონსტრუქციული ელემენტებისთვის.",
      "Опалубка для балок и конструктивных элементов.")),
    ("FRM-005", "formwork",
     ("Slab formwork", "გადახურვის ყალიბი", "Опалубка перекрытий"),
     ("Slab construction formwork with supporting props.",
      "გადახურვის ყალიბი საყრდენი დგარებით.",
      "Опалубка перекрытий с опорными стойками.")),
    ("RLG-001", "railing",
     ("Protective safety railings", "დამცავი მოაჯირები", "Защитные ограждения"),
     ("Metal safety railings for edges, stairs and platforms.",
      "ლითონის დამცავი მოაჯირები კიდეებისთვის, კიბეებისა და პლატფორმებისთვის.",
      "Металлические защитные ограждения для перепадов, лестниц и площадок.")),
    ("STR-001", "staircase",
     ("Metal staircases", "ლითონის კიბეები", "Металлические лестницы"),
     ("Durable metal staircases manufactured to measure.",
      "გამძლე ლითონის კიბეები, დამზადებული ზომების მიხედვით.",
      "Прочные металлические лестницы по индивидуальным размерам.")),
]

CITIES = {"Tbilisi": ("Tbilisi", "თბილისი", "Тбилиси"), "Batumi": ("Batumi", "ბათუმი", "Батуми"), "Kutaisi": ("Kutaisi", "ქუთაისი", "Кутаиси")}


EXPENSE_LABELS = {"materials": "მასალები", "labour": "სამუშაო ძალა", "equipment": "ტექნიკა", "transport": "ტრანსპორტი"}


class Command(BaseCommand):
    help = "Seed company content in Georgian, English and Russian (and optional demo data)."

    def add_arguments(self, parser):
        parser.add_argument("--demo", action="store_true", help="Also create sample business data.")

    @transaction.atomic
    def handle(self, *args, **options):
        with translation.override("en"):
            admin = self.seed_admin()
            self.seed_settings()
            self.seed_catalog()
            self.seed_products()
            if options["demo"]:
                self.seed_demo(admin)
        self.stdout.write(self.style.SUCCESS("Seed complete."))

    # -- content -----------------------------------------------------------

    def seed_admin(self):
        email = os.environ.get("ADMIN_EMAIL", "admin@newhousemodern.ge").lower()
        password = os.environ.get("ADMIN_PASSWORD", "ChangeMe-2026!")
        user = User.objects.filter(email=email).first()
        if user:
            return user
        user = User.objects.create_superuser(email=email, password=password, first_name="ადმინისტრატორი", last_name="")
        self.stdout.write(f"Created administrator {email}")
        return user

    @staticmethod
    def _fill_empty(obj, values: dict) -> bool:
        """Set translated fields that were never edited (empty, or still the model's
        English default, which modeltranslation copies into every language column)."""
        changed = False
        for name, value in values.items():
            current = getattr(obj, name)
            if not current or current == obj._meta.get_field(name).get_default():
                if current != value:
                    setattr(obj, name, value)
                    changed = True
        return changed

    def seed_settings(self):
        site = SiteSettings.load()
        texts = {}
        for field, values in SITE_TEXT.items():
            texts.update(tr(field, *values))
        if self._fill_empty(site, texts):
            site.save()
        pricing = PricingSettings.load()
        if self._fill_empty(pricing, tr("default_terms", *PRICING_TERMS)):
            pricing.save()

    def seed_catalog(self):
        categories = {}
        for order, (slug, icon, names, descriptions) in enumerate(CATEGORIES):
            categories[slug] = ServiceCategory.objects.filter(slug=slug).first() or ServiceCategory.objects.create(
                slug=slug, icon=icon, order=order, **tr("name", *names), **tr("description", *descriptions)
            )

        solutions = {}
        for order, (kind, names) in enumerate(SOLUTIONS):
            slug = slugify(names[0])
            solutions[names[0]] = Solution.objects.filter(slug=slug).first() or Solution.objects.create(
                slug=slug, kind=kind, order=order, **tr("name", *names)
            )

        material_categories = {}
        for names in MATERIAL_CATEGORIES:
            category = MaterialCategory.objects.filter(name_en=names[0]).first()
            if category is None:
                category = MaterialCategory.objects.create(**tr("name", *names))
            elif self._fill_empty(category, tr("name", *names)):
                category.save()
            material_categories[names[0]] = category
        materials = {}
        for sku, names, category, unit, cost, stock, minimum in MATERIALS:
            materials[sku] = Material.objects.filter(sku=sku).first() or Material.objects.create(
                sku=sku,
                category=material_categories[category],
                unit=unit,
                unit_cost=D(cost),
                quantity=D(stock),
                min_quantity=D(minimum),
                **tr("name", *names),
            )

        created = 0
        for order, (category, titles, summaries, unit, labour, solution_names, features, recipe) in enumerate(SERVICES):
            slug = slugify(titles[0])
            if Service.objects.filter(slug=slug).exists():
                continue
            service = Service.objects.create(
                slug=slug,
                category=categories[category],
                unit=unit,
                labour_hours_per_unit=D(labour),
                order=order,
                is_featured=titles[0] in FEATURED,
                **tr("title", *titles),
                **tr("summary", *summaries),
                **tr("features", *features),
            )
            service.solutions.set([solutions[name] for name in solution_names])
            for sku, consumption, waste in recipe:
                ServiceMaterial.objects.create(
                    service=service, material=materials[sku], consumption_per_unit=D(consumption), waste_percent=D(waste)
                )
            created += 1
        self.stdout.write(f"Catalog: {created} services created ({len(SERVICES)} defined), {len(MATERIALS)} materials")

    def seed_products(self):
        for order, (sku, category, names, descriptions) in enumerate(PRODUCTS):
            if Product.objects.filter(sku=sku).exists():
                continue
            Product.objects.create(
                sku=sku,
                category=category,
                unit="set" if category in ("scaffolding", "formwork") else "pcs",
                is_published=True,
                order=order,
                **tr("name", *names),
                **tr("description", *descriptions),
                **tr("standard", *STANDARD),
            )

    # -- demo data -----------------------------------------------------------
    # Quotations keep one English and one Russian example: each quotation has its own
    # language, and its PDF is produced in it.

    def seed_demo(self, admin):
        if Customer.objects.exists():
            self.stdout.write("Demo data already present — skipped.")
            return
        rng = random.Random(42)
        today = timezone.localdate()
        demo_password = os.environ.get("DEMO_PASSWORD", "Demo-2026!")

        users = {}
        for role, first, last, language in [
            (Role.MANAGER, "გიორგი", "ბერიძე", "ka"),
            (Role.SALES, "ნინო", "კაპანაძე", "ka"),
            (Role.PRODUCTION, "ლევან", "წიკლაური", "ru"),
        ]:
            user, _ = User.objects.get_or_create(
                email=f"{role}@newhousemodern.ge",
                defaults={"first_name": first, "last_name": last, "role": role, "language": language},
            )
            user.set_password(demo_password)
            user.save()
            users[role] = user
        manager, sales = users[Role.MANAGER], users[Role.SALES]

        # Business records are typed once, in the company's working language (Georgian).
        people = [
            ("დავით", "გელაშვილი", "ფასადის ბრიგადის ხელმძღვანელი", "350"), ("ირაკლი", "მაისურაძე", "მლესავი", "180"),
            ("ზურაბ", "ლომიძე", "მლესავი", "170"), ("თორნიკე", "აბაშიძე", "მოპირკეთების მემონტაჟე", "200"),
            ("საბა", "ჩხეიძე", "მოპირკეთების მემონტაჟე", "190"), ("მამუკა", "ჯღენტი", "დეკორატიული საფარების ოსტატი", "220"),
            ("ბექა", "კვარაცხელია", "შემდუღებელი", "210"), ("ლუკა", "ნაცვლიშვილი", "ავეჯის ოსტატი", "200"),
            ("ანა", "მჭედლიძე", "ინტერიერის დიზაინერი", "240"), ("გელა", "წერწვაძე", "ობიექტის პრორაბი", "280"),
        ]
        employees = [
            Employee.objects.create(
                first_name=f, last_name=l, position=p, daily_rate=D(rate),
                phone=f"+995 5{rng.randint(10, 99)} {rng.randint(10, 99)} {rng.randint(10, 99)} {rng.randint(10, 99)}",
                hire_date=today - timedelta(days=rng.randint(200, 2500)),
            )
            for f, l, p, rate in people
        ]
        team_objs = []
        for name, spec, leader, members in [
            ("ფასადის ბრიგადა №1", "facade", 0, [0, 1, 2, 9]),
            ("მოპირკეთების ბრიგადა", "cladding", 3, [3, 4]),
            ("დეკორატიული მოპირკეთების ბრიგადა", "finishing", 5, [5]),
            ("ლითონის საამქრო", "metal", 6, [6]),
            ("ავეჯის საამქრო", "furniture", 7, [7, 8]),
        ]:
            team = Team.objects.create(name=name, specialization=spec, leader=employees[leader])
            team.members.set([employees[i] for i in members])
            team_objs.append(team)

        customers = [
            Customer.objects.create(kind="company", name="შპს „საბურთალო რეზიდენსი“", contact_person="მიხეილ გოგუა",
                                    phone="+995 599 11 22 33", email="office@saburtalo-residence.ge", city="თბილისი",
                                    address="ვაჟა-ფშაველას გამზირი", status="active", source="referral", created_by=admin),
            Customer.objects.create(kind="individual", name="თამარ კიკნაძე", phone="+995 577 45 67 89",
                                    city="თბილისი", address="დიღომი", status="active", source="website", created_by=admin),
            Customer.objects.create(kind="company", name="სასტუმრო „ზღვისპირა“", contact_person="ნიკა დოლიძე",
                                    phone="+995 591 23 45 67", email="info@seasidehotel.ge", city="ბათუმი",
                                    status="active", source="phone", created_by=admin),
            Customer.objects.create(kind="company", name="ქუთაისის ბიზნეს-ცენტრი", contact_person="ეკა ჯაფარიძე",
                                    phone="+995 595 98 76 54", city="ქუთაისი", status="lead", source="social", created_by=sales),
            Customer.objects.create(kind="individual", name="გიორგი მაღრაძე", phone="+995 568 12 34 56",
                                    city="მცხეთა", status="lead", source="website", created_by=sales),
            Customer.objects.create(kind="company", name="ვაკე დეველოპმენტ გრუპი", contact_person="სოფო ლორთქიფანიძე",
                                    phone="+995 593 44 55 66", email="sopho@vakedev.ge", city="თბილისი",
                                    status="active", source="repeat", created_by=admin),
        ]

        services = {s.title_en: s for s in Service.objects.all()}
        project_specs = [
            (("Residential complex façade insulation", "საცხოვრებელი კომპლექსის ფასადის თბოიზოლაცია", "Утепление фасада жилого комплекса"),
             0, "in_progress", 62, -60, 45, "185000", "Tbilisi", "residential", 12, "5400",
             ["Energy-efficient insulation systems", "Professional façade painting"], [0, 1], True),
            (("Private house stone & plaster façade", "კერძო სახლის ქვისა და ბათქაშის ფასადი", "Фасад частного дома: камень и штукатурка"),
             1, "completed", 100, -150, -20, "38000", "Tbilisi", "house", 2, "420",
             ["Natural & artificial stone cladding", "Sand & cement façade plastering"], [0], True),
            (("Hotel lobby Venetian plaster & cladding", "სასტუმროს ლობის ვენეციური ბათქაში და მოპირკეთება", "Лобби отеля: венецианская штукатурка и облицовка"),
             2, "in_progress", 35, -25, 40, "64000", "Batumi", "commercial", 9, "860",
             ["Venetian plaster", "Compact laminate cladding"], [1, 2], True),
            (("Business centre ventilated façade", "ბიზნეს-ცენტრის ვენტილირებადი ფასადი", "Вентилируемый фасад бизнес-центра"),
             3, "planned", 0, 10, 120, "240000", "Kutaisi", "commercial", 7, "3200",
             ["Ventilated façade systems", "Aluminium composite panel (ACP) cladding"], [1], False),
            (("Apartment renovation & custom furniture", "ბინის რემონტი და ინდივიდუალური ავეჯი", "Ремонт квартиры и мебель на заказ"),
             5, "on_hold", 48, -40, -5, "52000", "Tbilisi", "residential", 1, "180",
             ["Interior & exterior renovation", "Custom furniture design & manufacturing"], [4], False),
            (("Townhouse textured façade", "თაუნჰაუსის ტექსტურული ფასადი", "Фактурный фасад таунхауса"),
             5, "completed", 100, -210, -95, "47000", "Tbilisi", "house", 3, "640",
             ["Textured decorative plaster", "Energy-efficient insulation systems"], [0, 2], True),
        ]
        summary_templates = (
            "{title} in {city}: {services}.",
            "{title}, {city}: {services}.",
            "{title}, {city}: {services}.",
        )
        projects = []
        for (titles, cust, status, progress, start, deadline, budget, city, btype, floors, area,
             service_titles, team_idx, portfolio) in project_specs:
            selected = [services[t] for t in service_titles if t in services]
            summaries = []
            for index, code in enumerate(LANGS):
                names = ", ".join(getattr(s, f"title_{code}") for s in selected)
                summaries.append(summary_templates[index].format(title=titles[index], city=CITIES[city][index], services=names.lower() if code == "en" else names))
            project = Project.objects.create(
                customer=customers[cust], status=status, progress=progress,
                start_date=today + timedelta(days=start), deadline=today + timedelta(days=deadline),
                completed_date=today + timedelta(days=deadline - 3) if status == "completed" else None,
                budget=D(budget), building_type=btype, floors=floors, area_m2=D(area),
                manager=manager, show_in_portfolio=portfolio, is_featured=portfolio and progress == 100,
                description="სადემონსტრაციო პროექტი.", created_by=admin,
                **tr("title", *titles), **tr("public_summary", *summaries), **tr("city", *CITIES[city]),
            )
            project.services.set(selected)
            project.teams.set([team_objs[i] for i in team_idx])
            project.employees.set([e for t in project.teams.all() for e in t.members.all()])
            projects.append(project)

            if status != "planned":
                spent_ratio = progress / 100 * 0.7
                for category, share in (("materials", 0.55), ("labour", 0.3), ("equipment", 0.1), ("transport", 0.05)):
                    amount = (D(budget) * D(str(round(spent_ratio * share, 4)))).quantize(D("0.01"))
                    if amount > 0:
                        ProjectExpense.objects.create(
                            project=project, category=category, amount=amount,
                            description=f"{EXPENSE_LABELS[category]} — {titles[1][:40]}",
                            date=today - timedelta(days=rng.randint(1, 120)), created_by=admin,
                        )
                for i, share in enumerate((0.3, 0.3, 0.4)):
                    if progress >= (i + 1) * 30 or status == "completed":
                        ProjectPayment.objects.create(
                            project=project, amount=(D(budget) * D(str(share))).quantize(D("0.01")),
                            date=today - timedelta(days=rng.randint(5, 300)), reference=f"INV-{project.code}-{i + 1}",
                            created_by=admin,
                        )
            for i, (milestone, offset) in enumerate(
                (("ობიექტის დათვალიერება და აზომვა", start + 2), ("მასალების მიწოდება", start + 10),
                 ("ძირითადი სამუშაოები", (start + deadline) // 2), ("საბოლოო შემოწმება და ჩაბარება", deadline))
            ):
                ProjectMilestone.objects.create(
                    project=project, title=milestone, order=i, due_date=today + timedelta(days=offset),
                    is_completed=status == "completed" or (offset < 0 and progress > 40),
                )

        for name, phone, service_title, status, message in [
            ("ქეთევან ბერიძე", "+995 555 12 12 12", "Energy-efficient insulation systems", "new",
             "გამარჯობა, 3-სართულიან სახლს ტყნეთში სჭირდება თბოიზოლაცია, დაახლოებით 450 მ². რა ეღირება?"),
            ("ალექსანდრე ცინცაძე", "+995 571 34 34 34", "Venetian plaster", "contacted",
             "მაინტერესებს ვენეციური ბათქაში მისაღებისა და დერეფნისთვის, დაახლოებით 90 მ²."),
            ("მარიამ გვენეტაძე", "+995 598 56 56 56", "Aluminium composite panel (ACP) cladding", "qualified",
             "საოფისე შენობის ფასადი, დაახლოებით 1 200 მ² ACP. გთხოვთ, დამიკავშირდეთ ობიექტის დასათვალიერებლად."),
            ("დაჩი ხურციძე", "+995 592 78 78 78", "Custom furniture design & manufacturing", "new",
             "ახალი ბინისთვის მჭირდება სამზარეულო და ჩაშენებული კარადები."),
            ("ლიკა შარაშიძე", "+995 557 90 90 90", "Façade scaffolding systems", "lost",
             "ფასადის ხარაჩოების ქირაობა 2 თვით, 600 მ²."),
        ]:
            Enquiry.objects.create(
                name=name, phone=phone, service=services.get(service_title), status=status, message=message,
                source="website", assigned_to=sales,
            )
        enquiry_customer = Enquiry.objects.filter(status="qualified").first()
        enquiry_customer.convert_to_customer(user=sales)

        for customer in customers[:4]:
            Communication.objects.create(
                customer=customer, channel="call", direction="outbound", subject="პირველადი კონსულტაცია",
                summary="განვიხილეთ სამუშაოს მოცულობა, ვადები და სასურველი მასალები. შევთანხმდით ობიექტის დათვალიერებაზე.",
                occurred_at=timezone.now() - timedelta(days=rng.randint(3, 40)), user=sales,
                follow_up_date=today + timedelta(days=rng.randint(1, 7)),
            )
            Communication.objects.create(
                customer=customer, channel="site_visit", direction="outbound", subject="ობიექტის აზომვა",
                summary="ავზომეთ ფასადის ფართობები და შევამოწმეთ კედლების მდგომარეობა.",
                occurred_at=timezone.now() - timedelta(days=rng.randint(1, 20)), user=manager,
            )

        pricing = PricingSettings.load()
        for customer, title, status, language, lines, project in [
            (customers[3], "ბიზნეს-ცენტრის ვენტილირებადი ACP ფასადი", "sent", "ka",
             [("Ventilated façade systems", 3200), ("Aluminium composite panel (ACP) cladding", 3200)], projects[3]),
            (customers[4], "სახლის თბოიზოლაცია და დეკორატიული ბათქაში", "draft", "ka",
             [("Energy-efficient insulation systems", 380), ("Textured decorative plaster", 380)], None),
            (customers[0], "Façade insulation — residential complex", "accepted", "en",
             [("Energy-efficient insulation systems", 5400), ("Professional façade painting", 5400)], projects[0]),
            (enquiry_customer.customer, "Облицовка фасада офисного здания АКП", "draft", "ru",
             [("Aluminium composite panel (ACP) cladding", 1200)], None),
        ]:
            with translation.override(language):
                terms = pricing.default_terms
            quotation = Quotation.objects.create(
                customer=customer, title=title, status=status, language=language, project=project,
                created_by=sales, site_address=customer.city, valid_until=today + timedelta(days=30), terms=terms,
            )
            for service_title, quantity in lines:
                add_estimate_to_quotation(quotation, services[service_title], D(quantity))

        Contract.objects.create(
            title="ფასადის თბოიზოლაციის სამუშაოები", customer=customers[0], project=projects[0], value=projects[0].budget,
            status="active", signed_date=today - timedelta(days=65), start_date=projects[0].start_date,
            end_date=projects[0].deadline,
        )
        Contract.objects.create(
            title="ქვისა და ბათქაშის ფასადი", customer=customers[1], project=projects[1], value=projects[1].budget,
            status="completed", signed_date=today - timedelta(days=160), start_date=projects[1].start_date,
            end_date=projects[1].deadline,
        )

        for sku, qty in (("PLS-001", 80), ("INS-001", 250), ("PNT-002", 40)):
            record_movement(material=Material.objects.get(sku=sku), movement_type="out", quantity=D(qty),
                            user=manager, project=projects[0], reference="ობიექტზე მიწოდება")
        record_movement(material=Material.objects.get(sku="DEC-003"), movement_type="out", quantity=D(9),
                        user=manager, project=projects[2], reference="ობიექტზე მიწოდება")
        record_movement(material=Material.objects.get(sku="CLD-001"), movement_type="in", quantity=D(20),
                        user=manager, reference="მომწოდებლის ინვოისი 2231")

        production = users[Role.PRODUCTION]
        scaffolding = Product.objects.get(sku="SCF-001")
        slab = Product.objects.get(sku="FRM-005")
        done = ProductionOrder.objects.create(product=scaffolding, quantity=D(40), status="completed",
                                              start_date=today - timedelta(days=30), due_date=today - timedelta(days=5),
                                              responsible=employees[6], material_cost=D("18400"), labour_cost=D("6200"))
        done.post_stock_if_completed()
        ProductionOrder.objects.create(product=slab, quantity=D(25), status="in_progress", start_date=today - timedelta(days=4),
                                       due_date=today + timedelta(days=12), responsible=employees[6],
                                       project=projects[3], material_cost=D("9600"), labour_cost=D("3100"))
        Product.objects.filter(sku="RLG-001").update(quantity=D(120), min_quantity=D(50))
        Product.objects.filter(sku="STR-001").update(quantity=D(3), min_quantity=D(2))

        for name, kind, status, project, service_in in (
            ("ბათქაშის შესასხურებელი მანქანა", "machine", "in_use", projects[0], 40),
            ("ფასადის ხარაჩოების კომპლექტი №1 (800 მ²)", "scaffold_set", "in_use", projects[0], 90),
            ("ფასადის ხარაჩოების კომპლექტი №2 (600 მ²)", "scaffold_set", "available", None, 120),
            ("პანელების საჭრელი ხერხი", "tool", "available", None, 9),
            ("სატვირთო ავტომობილი", "vehicle", "in_use", projects[2], 5),
            ("შედუღების ინვერტორი", "tool", "maintenance", None, -2),
        ):
            Equipment.objects.create(
                name=name, kind=kind, status=status, project=project, code=f"EQ-{rng.randint(100, 999)}",
                next_service_date=today + timedelta(days=service_in),
                last_service_date=today - timedelta(days=180),
                location="მთავარი საწყობი" if project is None else project.city_ka,
            )
        self.stdout.write(f"Demo data created. Demo users use the password {demo_password!r} (production: {production.email}).")
