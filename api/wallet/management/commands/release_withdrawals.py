from django.core.management.base import BaseCommand

from wallet.services import release_due_withdrawals


class Command(BaseCommand):
    help = "Flip pending withdrawals whose release_at has passed to released."

    def handle(self, *args, **options):
        n = release_due_withdrawals()
        self.stdout.write(self.style.SUCCESS(f"Released {n} withdrawals."))