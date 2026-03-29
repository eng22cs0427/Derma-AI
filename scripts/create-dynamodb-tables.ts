import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import * as fs from 'fs';
import * as path from 'path';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const response = await client.send(new ListTablesCommand({}));
    return response.TableNames?.includes(tableName) || false;
  } catch (error) {
    console.error('Error checking table existence:', error);
    return false;
  }
}

async function createTable(tableConfig: any): Promise<void> {
  const tableName = tableConfig.TableName;

  if (await tableExists(tableName)) {
    console.log(`✓ Table ${tableName} already exists, skipping...`);
    return;
  }

  try {
    console.log(`Creating table: ${tableName}...`);
    await client.send(new CreateTableCommand(tableConfig));
    console.log(`✓ Table ${tableName} created successfully`);
  } catch (error) {
    console.error(`✗ Failed to create table ${tableName}:`, error);
    throw error;
  }
}

async function main() {
  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'dynamodb-schema.json');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);

    console.log('Starting DynamoDB table creation...\n');

    for (const tableConfig of schema.tables) {
      await createTable(tableConfig);
    }

    console.log('\n✅ All DynamoDB tables created successfully!');
    console.log('\nCreated tables:');
    schema.tables.forEach((table: any) => {
      console.log(`  - ${table.TableName}`);
    });
  } catch (error) {
    console.error('\n❌ Table creation failed:', error);
    process.exit(1);
  }
}

main();
