from django.core.management.base import BaseCommand
from companies.models import Country, City


class Command(BaseCommand):
    help = 'Seeds countries and cities for company locations'

    def handle(self, *args, **options):
        # Countries with codes (focus on Africa + major global hubs)
        countries_data = [
            # Africa
            {'name': 'South Africa', 'code': 'ZA'},
            {'name': 'Nigeria', 'code': 'NG'},
            {'name': 'Kenya', 'code': 'KE'},
            {'name': 'Egypt', 'code': 'EG'},
            {'name': 'Ghana', 'code': 'GH'},
            {'name': 'Morocco', 'code': 'MA'},
            {'name': 'Tanzania', 'code': 'TZ'},
            {'name': 'Uganda', 'code': 'UG'},
            {'name': 'Ethiopia', 'code': 'ET'},
            {'name': 'Rwanda', 'code': 'RW'},
            {'name': 'Senegal', 'code': 'SN'},
            {'name': 'Botswana', 'code': 'BW'},
            {'name': 'Namibia', 'code': 'NA'},
            {'name': 'Mauritius', 'code': 'MU'},
            {'name': 'Zimbabwe', 'code': 'ZW'},
            # Major Global Hubs
            {'name': 'United States', 'code': 'US'},
            {'name': 'United Kingdom', 'code': 'GB'},
            {'name': 'Germany', 'code': 'DE'},
            {'name': 'France', 'code': 'FR'},
            {'name': 'Netherlands', 'code': 'NL'},
            {'name': 'Switzerland', 'code': 'CH'},
            {'name': 'Canada', 'code': 'CA'},
            {'name': 'Australia', 'code': 'AU'},
            {'name': 'Singapore', 'code': 'SG'},
            {'name': 'United Arab Emirates', 'code': 'AE'},
            {'name': 'India', 'code': 'IN'},
            {'name': 'Israel', 'code': 'IL'},
            {'name': 'Ireland', 'code': 'IE'},
            {'name': 'Portugal', 'code': 'PT'},
            {'name': 'Spain', 'code': 'ES'},
        ]

        # Cities by country
        cities_data = {
            'South Africa': [
                'Cape Town', 'Johannesburg', 'Pretoria', 'Durban', 'Port Elizabeth',
                'Stellenbosch', 'Sandton', 'Centurion', 'Midrand',
            ],
            'Nigeria': ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Kano'],
            'Kenya': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
            'Egypt': ['Cairo', 'Alexandria', 'Giza'],
            'Ghana': ['Accra', 'Kumasi', 'Tema'],
            'Morocco': ['Casablanca', 'Rabat', 'Marrakech', 'Tangier'],
            'Tanzania': ['Dar es Salaam', 'Arusha', 'Dodoma'],
            'Uganda': ['Kampala', 'Entebbe', 'Jinja'],
            'Ethiopia': ['Addis Ababa', 'Dire Dawa'],
            'Rwanda': ['Kigali'],
            'Senegal': ['Dakar'],
            'Botswana': ['Gaborone', 'Francistown'],
            'Namibia': ['Windhoek', 'Swakopmund'],
            'Mauritius': ['Port Louis', 'Ebene'],
            'Zimbabwe': ['Harare', 'Bulawayo'],
            'United States': [
                'New York', 'San Francisco', 'Los Angeles', 'Seattle', 'Austin',
                'Boston', 'Chicago', 'Denver', 'Miami', 'Atlanta', 'Remote (US)',
            ],
            'United Kingdom': ['London', 'Manchester', 'Edinburgh', 'Bristol', 'Cambridge', 'Remote (UK)'],
            'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Remote (Germany)'],
            'France': ['Paris', 'Lyon', 'Marseille', 'Remote (France)'],
            'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Remote (Netherlands)'],
            'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Remote (Switzerland)'],
            'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Remote (Canada)'],
            'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Remote (Australia)'],
            'Singapore': ['Singapore'],
            'United Arab Emirates': ['Dubai', 'Abu Dhabi'],
            'India': ['Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune', 'Chennai', 'Remote (India)'],
            'Israel': ['Tel Aviv', 'Jerusalem', 'Haifa'],
            'Ireland': ['Dublin', 'Cork', 'Remote (Ireland)'],
            'Portugal': ['Lisbon', 'Porto', 'Remote (Portugal)'],
            'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Remote (Spain)'],
        }

        countries_created = 0
        cities_created = 0

        for country_data in countries_data:
            country, created = Country.objects.get_or_create(
                code=country_data['code'],
                defaults={'name': country_data['name']}
            )
            if created:
                countries_created += 1
                self.stdout.write(f"  Created country: {country.name}")

            # Create cities for this country
            if country.name in cities_data:
                for city_name in cities_data[country.name]:
                    city, city_created = City.objects.get_or_create(
                        name=city_name,
                        country=country
                    )
                    if city_created:
                        cities_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {countries_created} countries and {cities_created} cities'
            )
        )
