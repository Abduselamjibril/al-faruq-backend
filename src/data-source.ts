import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value;
};

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: getEnv('DB_HOST'),
  port: parseInt(getEnv('DB_PORT'), 10),
  username: getEnv('DB_USERNAME'),
  password: getEnv('DB_PASSWORD'),
  database: getEnv('DB_DATABASE'),

  // This path finds ALL entities in your project
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],

  // FIX: This now points to the compiled JavaScript migration files in the `dist` folder.
  migrations: [join(__dirname, '..', '/*-*.js')],

  synchronize: false,
};

// ADD THIS: Create and export the DataSource instance.
// This allows us to use it in `main.ts` to run migrations on startup.
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;