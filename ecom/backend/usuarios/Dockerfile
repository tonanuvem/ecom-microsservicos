FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Escuta em 0.0.0.0 para aceitar conexões externas
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
