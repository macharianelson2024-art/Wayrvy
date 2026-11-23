from django.db import migrations


def create_default_goals(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    Goal = apps.get_model("wallet", "Goal")

    users_without_default = User.objects.exclude(goals__is_default=True)
    Goal.objects.bulk_create(
        [
            Goal(user=user, name="General savings", is_default=True)
            for user in users_without_default.iterator()
        ]
    )


class Migration(migrations.Migration):

    dependencies = [
        ("wallet", "0001_initial"),
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(create_default_goals, migrations.RunPython.noop),
    ]