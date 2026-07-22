# Project Description
ft_transcendence is the final common core project at 42 School. It requires building a full-stack, single-page web application centered on a real-time multiplayer Pong game, playable via tournaments with matchmaking and remote players. The current subject is modular: a mandatory base (Pong, basic user auth, single-page app) is extended through optional modules covering backend frameworks, databases, frontend frameworks, gameplay/UX, AI opponents, cybersecurity (2FA, JWT, WAF), accessibility, DevOps (microservices, logging, monitoring), and graphics (3D via WebGL/Three.js). Students choose a set of modules reaching a required point total, allowing flexible tech stacks (Django, Fastify, PostgreSQL, Docker, etc.) instead of the older rigid requirements. Security, containerization (Docker), and a coherent architecture remain core evaluation criteria.
# Our Vision
Our take on ft_transcendence goes beyond a single Pong game: we're building a small games platform hosting three distinct games (chess, blackjack “uno game”),  each accessible from a shared hub with unified accounts, matchmaking, and tournaments. Architecturally, each game will run as its own dedicated data, keeping game logic and state isolated while sharing common services (auth, user profiles, chat) through the platform's API gateway. This lets us apply the DevOps module meaningfully, since each game becomes a natural service boundary rather than an artificial split.

# Content
Chess
Blackjack
Card game (uno like)
Each games can be playable with bots or real player online or lan (real-time)
Database postgrey sql
Whole social content (friends list, chat, stats, history,profile edit…)
Security (password manager, 2FA…)
42 api authentication
Advanced permissions system
Auto moderation

# Team organization
Roles
Product owner
Project manager
Technical
Dev

## TASKS
YOUNES: frontend en react + vite.js
ILYACE: backend en java + sprintboot
ERWAN et RAPH: devOps + dev des jeux
