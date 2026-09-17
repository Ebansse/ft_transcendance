COMPOSE = docker compose

all: up

up:
	@$(COMPOSE) up -d --build

down:
	@$(COMPOSE) down

logs:
	@$(COMPOSE) logs -f

ps:
	@$(COMPOSE) ps

clean:
	@$(COMPOSE) down --rmi local

fclean:
	@$(COMPOSE) down -v --rmi local

re: down up

.PHONY: all up down logs ps clean fclean re
