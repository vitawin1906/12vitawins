// tests/setup.ts

import request from "supertest";

import {db} from "../src/db/db";
import {app} from "../src";

beforeAll(async () => {
    // Полная очистка БД перед тестами
    await db.execute(`DO $$
  DECLARE
      r RECORD;
  BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
  END $$;`);
});

afterAll(async () => {
    await db.end();
});

export const api = request(app);
