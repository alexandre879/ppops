from django.db import migrations, models

# Numbers the company no longer uses. Compared by digits only, so any spacing matches.
RETIRED = {"995579013241", "995551277730", "995593286894"}
FIELDS = ("phone_primary", "phone_secondary", "phone_tertiary", "phone_quaternary", "phone_quinary")


def digits(value):
    return "".join(ch for ch in value or "" if ch.isdigit())


def remove_retired_numbers(apps, schema_editor):
    SiteSettings = apps.get_model("core", "SiteSettings")
    for site in SiteSettings.objects.all():
        kept = []
        for name in FIELDS:
            value = getattr(site, name)
            d = digits(value)
            if not value or d in RETIRED or ("995" + d) in RETIRED:
                continue
            kept.append(value)
        if not kept:
            kept = ["+995 557 60 30 04", "+995 568 28 27 72"]
        kept += [""] * (len(FIELDS) - len(kept))
        for name, value in zip(FIELDS, kept):
            setattr(site, name, value)
        site.save(update_fields=list(FIELDS))


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_sitesettings_phone_quinary"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="phone_primary",
            field=models.CharField(default="+995 557 60 30 04", max_length=40),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="phone_secondary",
            field=models.CharField(blank=True, default="+995 568 28 27 72", max_length=40),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="phone_tertiary",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="phone_quaternary",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AlterField(
            model_name="sitesettings",
            name="phone_quinary",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.RunPython(remove_retired_numbers, migrations.RunPython.noop),
    ]
