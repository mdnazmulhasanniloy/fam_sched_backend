## 📁 Run in Docker

---

## 1. Build new Production Image:

Build new Production Image:

```sh
docker build -t nazmulhasn/any_day_app_backend:latest .
```

---

## 2. Push to Docker Hub

```sh
docker push nazmulhasn/any_day_app_backend:latest
```

## 3. Other computer/server: pull new image

Inside the project folder:

```sh
docker-compose pull
```

---

## 4. Restart with the updated version

```sh
docker-compose down && docker-compose up -d
```
