# Java
Java 21 minimum
```bash
java -version
```
La sortie doit être similaire à : `java version "21.x.x"` ou version superieur
 
**Installation :** Si Java n'est pas installé, téléchargez une distribution JDK 21 (Eclipse Temurin, OpenJDK, Oracle JDK) et configurez la variable d'environnement `JAVA_HOME`.
 
# apache
Permet de gérer les dépendances et de builder le projet.
 
**Vérification :**
```bash
mvn -version
```
 
# docker
PostgreSQL s'exécute dans un conteneur Docker.
 
**Vérification :**
```bash
docker --version
docker compose version
```
 
**Installation :** Téléchargez et installez [Docker Desktop](https://www.docker.com/products/docker-desktop/).
 
# setup le projet
Créez un fichier `.env` à la racine du projet à partir du fichier exemple :
```bash
cd backend && cp .env.example .env
```
 
Adaptez les valeurs dans le fichier `.env` selon vos besoins :
```env
# Base de données PostgreSQL
POSTGRES_DB=mydatabase
POSTGRES_USER=myuser
POSTGRES_PASSWORD=my_password
 
# Configuration Spring Datasource
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/mydatabase
SPRING_DATASOURCE_USERNAME=myuser
SPRING_DATASOURCE_PASSWORD=my_password
```

# lancer le back (sprint-boot)
 
apres que postgresql tourne bien

terminal :
```bash
cd backend && mvn spring-boot:run
```

dans l'IDE (pour les faible):
1. Ouvrez le projet en tant que Projet Maven.
2. Naviguez vers `backend/src/main/java/com/transcendance/backend/BackendApplication.java`.
3. Exécutez la méthode `main()`.
L'application démarrera sur [http://localhost:8080](http://localhost:8080).


dans pom.xml il y a spring-boot-docker-compose qui permet de 
lancer automatiquement docker compose up -d pour lancer la db
ca evite de le faire soit meme

# verifier que la db est ok

```bash
docker exec -it db psql -U myuser -d mydatabase
```
 
Commandes utiles `psql` :
 
- `\l` : Lister toutes les bases de données.
- `\dt` : Lister toutes les tables de la base courante.
- `SELECT * FROM users;` : Consulter les données d'une table.
- `\q` : Quitter PostgreSQL.

c'est du mysql classique, juste les raccourcis permettent d'aller plus vite

# pour lancer le front

```bash
cd front && npm install && npm run dev
```

le front tourne sur vite.js

# stop le projet

control + c dans le terminal pour stopper sprint-boot et dans l'autre terminal pour stopper vite.js
 
puis pour postgres
```bash
cd backend && docker compose down
```

## Testing the Backend API

You can test the backend endpoints using **Postman**.

### Steps

1. Start the application
   or run the Spring Boot application from your IDE.

2. Open Postman.

3. Create a new request and use the appropriate HTTP method (`GET`, `POST`, `PUT`, `DELETE`, etc.).

4. Use the backend URL, for example:
   ```
   http://localhost:8080/api/auth/register
   ```

5. For `POST` and `PUT` requests:
   - Select **Body** → **raw**
   - Choose **JSON**
   - Send a JSON payload, for example:
     ```json
     {
       "userName": "john_doe",
       "email": "john@example.com",
       "password": "password123",
       "confirmedPassword": "password123"
     }
     ```

6. Click **Send** and verify the response status and body.
