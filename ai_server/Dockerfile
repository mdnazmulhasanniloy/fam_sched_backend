FROM python:3.11-slim

WORKDIR /app
RUN apt-get update && apt-get install -y tzdata
ENV TZ=Asia/Dhaka

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt 

COPY . .

EXPOSE 2007

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "2007"]

 