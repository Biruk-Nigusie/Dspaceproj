from django.core.management.base import BaseCommand
from resources.models import Resource
import random

class Command(BaseCommand):
    help = 'Seed database with sample resources'

    def handle(self, *args, **options):
        sample_resources = [
            {
                'title': 'Introduction to Machine Learning',
                'authors': 'Dr. Abebe Kebede, Prof. Sara Mohammed',
                'description': 'A comprehensive guide to machine learning concepts and applications in Ethiopian context.',
                'source': 'koha',
                'resource_type': 'book',
                'year': 2023,
                'publisher': 'Addis Ababa University Press',
                'external_id': 'koha_001',
                'download_count': random.randint(10, 100),
                'view_count': random.randint(50, 500)
            },
            {
                'title': 'Digital Transformation in Ethiopia',
                'authors': 'Ministry of Innovation & Technology',
                'description': 'Strategic roadmap for digital transformation initiatives across Ethiopian government sectors.',
                'source': 'dspace',
                'resource_type': 'report',
                'year': 2024,
                'publisher': 'MINT',
                'external_id': 'dspace_001',
                'download_count': random.randint(20, 150),
                'view_count': random.randint(100, 800)
            },
            {
                'title': 'Artificial Intelligence Research Papers',
                'authors': 'Various Authors',
                'description': 'Collection of AI research papers from Ethiopian universities and research institutions.',
                'source': 'dspace',
                'resource_type': 'article',
                'year': 2023,
                'publisher': 'Ethiopian AI Research Consortium',
                'external_id': 'dspace_002',
                'download_count': random.randint(5, 80),
                'view_count': random.randint(30, 300)
            },
            {
                'title': 'Blockchain Technology Implementation Guide',
                'authors': 'Tech Innovation Team',
                'description': 'Practical guide for implementing blockchain solutions in government services.',
                'source': 'koha',
                'resource_type': 'document',
                'year': 2024,
                'publisher': 'Government Technology Office',
                'external_id': 'koha_002',
                'download_count': random.randint(15, 120),
                'view_count': random.randint(75, 600)
            },
            {
                'title': 'Cybersecurity Framework for Ethiopia',
                'authors': 'National Cybersecurity Agency',
                'description': 'Comprehensive cybersecurity framework and best practices for Ethiopian organizations.',
                'source': 'dspace',
                'resource_type': 'report',
                'year': 2023,
                'publisher': 'National Cybersecurity Agency',
                'external_id': 'dspace_003',
                'download_count': random.randint(25, 200),
                'view_count': random.randint(150, 1000)
            }
        ]

        for resource_data in sample_resources:
            resource, created = Resource.objects.get_or_create(
                source=resource_data['source'],
                external_id=resource_data['external_id'],
                defaults=resource_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created resource: {resource.title}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Resource already exists: {resource.title}')
                )

        self.stdout.write(
            self.style.SUCCESS('Successfully seeded sample resources!')
        )