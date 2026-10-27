.PHONY: install run build test verify container
install:
	npm ci
run:
	npm run dev
build:
	npm run build
test:
	npm test
verify:
	npm run build
	npm test
container:
	docker build -t agent-control-plane .
