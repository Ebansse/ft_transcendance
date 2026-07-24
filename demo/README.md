

Readme · MD
# 🚀 Demo - Backend Spring Boot + PostgreSQL
 
[![Java 21](https://img.shields.io/badge/Java-21-orange.svg?style=flat&logo=openjdk)](https://jdk.java.net/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen.svg?style=flat&logo=springboot)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?style=flat&logo=docker)](https://www.docker.com/)
 
Bienvenue dans le projet **Demo Backend Spring Boot & PostgreSQL**. Ce dépôt fournit une architecture de départ prête pour le développement et la production, orchestrée avec Docker Compose et configurée via des variables d'environnement sécurisées.
 
---
 
## 📑 Sommaire
 
- [📋 Prérequis](#-prérequis)
- [⚙️ Configuration du projet](#️-configuration-du-projet)
- [🛢️ Lancement de PostgreSQL](#️-lancement-de-postgresql)
- [☕ Lancer l'application Spring Boot](#-lancer-lapplication-spring-boot)
- [🔍 Vérifier PostgreSQL (CLI)](#-vérifier-postgresql-cli)
- [🛑 Arrêter le projet](#-arrêter-le-projet)
- [📁 Structure du projet](#-structure-du-projet)
- [🔧 Problèmes fréquents & Dépannage](#-problèmes-fréquents--dépannage)
---
 
## 📋 Prérequis
 
Avant de commencer, assurez-vous d'avoir installé les composants suivants sur votre machine :
 
### 1. Java JDK 21
Le projet nécessite **Java 21**.
 
**Vérification :**
```bash
java -version
```
La sortie doit être similaire à : `java version "21.x.x"`
 
**Installation :** Si Java n'est pas installé, téléchargez une distribution JDK 21 (Eclipse Temurin, OpenJDK, Oracle JDK) et configurez la variable d'environnement `JAVA_HOME`.
 
### 2. Apache Maven
Permet de gérer les dépendances et de builder le projet.
 
**Vérification :**
```bash
mvn -version
```
 
### 3. Docker & Docker Compose
PostgreSQL s'exécute dans un conteneur Docker.
 
**Vérification :**
```bash
docker --version
docker compose version
```
 
**Installation :** Téléchargez et installez [Docker Desktop](https://www.docker.com/products/docker-desktop/).
 
---
 
## ⚙️ Configuration du projet
 
### 1. Cloner le dépôt
```bash
git clone <repository_url>
cd demo
```
 
### 2. Configuration des variables d'environnement (.env)
Le projet utilise des variables d'environnement pour isoler les identifiants et éviter de publier des secrets sur Git.
 
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
 
⚠️ **Sécurité :** Le fichier `.env` ne doit jamais être envoyé sur Git. Assurez-vous qu'il figure bien dans votre fichier `.gitignore`.
 
---
 
## 🛢️ Lancement de PostgreSQL
 
Depuis la racine du projet, lancez le conteneur PostgreSQL :
```bash
docker compose up -d
```
PostgreSQL sera accessible sur `localhost:5432`.
 
### Vérifier le conteneur
```bash
docker ps
```
Vous devez voir un conteneur actif nommé `demo-postgres-1` (ou similaire).
 
💡 **Initialisation automatique :** Lors du premier lancement, PostgreSQL crée automatiquement la base de données (`POSTGRES_DB`), l'utilisateur (`POSTGRES_USER`) et le mot de passe (`POSTGRES_PASSWORD`).
 
---
 
## ☕ Lancer l'application Spring Boot
 
Une fois le conteneur PostgreSQL démarré et opérationnel :
 
### Option A : En ligne de commande (Terminal)
```bash
mvn spring-boot:run
```
 
### Option B : Depuis votre IDE (IntelliJ IDEA, Eclipse, VS Code)
1. Ouvrez le projet en tant que Projet Maven.
2. Naviguez vers `src/main/java/com/transcendance/demo/DemoApplication.java`.
3. Exécutez la méthode `main()`.
L'application démarrera sur [http://localhost:8080](http://localhost:8080).
 
---
 
## 🔍 Vérifier PostgreSQL (CLI)
 
Pour vous connecter directement à la base de données dans le conteneur Docker :
 
```bash
docker exec -it demo-postgres-1 psql -U myuser -d mydatabase
```
 
Commandes utiles `psql` :
 
- `\l` : Lister toutes les bases de données.
- `\dt` : Lister toutes les tables de la base courante.
- `SELECT * FROM users;` : Consulter les données d'une table.
- `\q` : Quitter PostgreSQL.
---
 
## 🛑 Arrêter le projet
 
**Arrêter Spring Boot :** Utilisez la combinaison de touches `CTRL + C` dans le terminal où tourne l'application.
 
**Arrêter PostgreSQL :**
```bash
docker compose down
```
 
---
 
## 📁 Structure du projet
 
```
demo/
├── .env                  # Secrets locaux (Ignoré par Git)
├── .env.example          # Exemple de configuration
├── compose.yaml          # Orchestration Docker (PostgreSQL)
├── pom.xml               # Fichier de descripteur Maven
│
└── src/
    └── main/
        └── java/
            └── com/
                └── transcendance/
                    └── demo/
                        └── DemoApplication.java
```
 
---
 
## 🔧 Problèmes fréquents & Dépannage
 
### ❌ `password authentication failed for user`
**Cause :** Les identifiants dans `.env` ont été modifiés après la première création du volume Docker. PostgreSQL continue d'utiliser les identifiants stockés dans le volume existant.
 
**Solution :** Réinitialisez le volume Docker (⚠️ Attention : supprime les données locales) :
```bash
docker compose down -v
docker compose up -d
```
 
### ❌ `no configuration file provided`
**Cause :** La commande Docker est exécutée en dehors du répertoire contenant `compose.yaml`.
 
**Solution :** Replacez-vous dans le dossier racine :
```bash
cd /chemin/vers/le/projet
docker compose up -d
```
 
### 🔍 Consulter les logs de PostgreSQL
Pour déboguer un problème de démarrage de la base de données :
```bash
docker compose logs -f postgres
```
