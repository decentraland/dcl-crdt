.DEFAULT_GOAL := build

ifneq ($(CI), true)
LOCAL_ARG = --local --verbose --diagnostics
endif

update-snapshots:
	mv test/pre-data/* data/

test:
	rm -rf test/pre-data/*
	node_modules/.bin/jest --detectOpenHandles --coverage --colors --runInBand $(TESTARGS)

lint:
	node_modules/.bin/eslint . --ext .ts

lint-fix:
	node_modules/.bin/eslint . --ext .ts --fix

build:
	./node_modules/.bin/tsc -p tsconfig.json
	rm -rf node_modules/@microsoft/api-extractor/node_modules/typescript || true
	./node_modules/.bin/api-extractor run $(LOCAL_ARG) --typescript-compiler-folder ./node_modules/typescript

.PHONY: build test
