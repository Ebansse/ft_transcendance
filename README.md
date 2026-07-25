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
cp .env.example .env
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

# lancer postgresql
 
Depuis la racine du projet, lancez le conteneur PostgreSQL :
```bash
docker compose up -d
```
PostgreSQL sera accessible sur `localhost:5432` pour que le back (soit sprint-boot) puisse se connecter.
 
```bash
docker ps
```
Vous devez voir un conteneur actif nommé `db`
 
💡 A capter : Lors du premier lancement, PostgreSQL crée automatiquement la base de données (`POSTGRES_DB`), l'utilisateur (`POSTGRES_USER`) et le mot de passe (`POSTGRES_PASSWORD`).
  d'ou le .env

une fois le container qui tourne, faut verifier que les bases soient bien creent.

```bash
docker exec -it db psql -U myuser -d mydatabase
```
 
Commandes utiles `psql` :
 
- `\l` : Lister toutes les bases de données.
- `\dt` : Lister toutes les tables de la base courante.
- `SELECT * FROM users;` : Consulter les données d'une table.
- `\q` : Quitter PostgreSQL.

c'est du mysql classique, juste les raccourcis permettent d'aller plus vite
 
# lancer le back (sprint-boot)
 
apres que postgresql tourne bien

terminal :
```bash
mvn spring-boot:run
```
 
# dans l'IDE (pour les faible)
1. Ouvrez le projet en tant que Projet Maven.
2. Naviguez vers `backend/src/main/java/com/transcendance/backend/BackendApplication.java`.
3. Exécutez la méthode `main()`.
L'application démarrera sur [http://localhost:8080](http://localhost:8080).

 
# stop le projet

control + c dans le terminal pour stopper sprint-boot
 
puis pour postgres
```bash
docker compose down
```
