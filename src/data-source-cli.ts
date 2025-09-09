import { DataSource } from 'typeorm';
import { dataSourceOptions } from './data-source';

// This file imports the options and exports a new DataSource instance
// specifically for the TypeORM CLI.
const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;