FROM python:3.13.11

WORKDIR /usr/src/app
COPY requirements.txt ./
RUN pip install -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["sh", "-c", "python manage.py migrate && gunicorn backend.wsgi:application --timeout 120 --bind 0.0.0.0:8000"]
