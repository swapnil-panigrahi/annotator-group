import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { PrismaClient, Level } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

// Initialize Prisma client
const prisma = new PrismaClient();

interface CsvRecord {
  id: string;
  input_text: string;
  lay_people: string;
  pre_med_students: string;
  researchers: string;
  experts_in_field: string;
}

/**
 * Import CSV data into the TextSummary table
 * Expected CSV format: Abstract,lay_people,pre_med_students,researchers_OOD,experts_in_field
 */
async function importSummaries(filePath: string): Promise<void> {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const records = parse(fileContent, {
      columns: true, // use header row for column names
      skip_empty_lines: true,
      trim: true,
    }) as CsvRecord[];

    console.log(`Found ${records.length} records to import`);

    const summaries = records.flatMap((record, index) => {
      const baseId = uuidv4();
      const createdAt = new Date();
      const summariesForRecord = [];

      if (record.lay_people) {
        summariesForRecord.push({
          id: uuidv4(),
		  pmid: record.id,
          text: record.input_text,
          summary: record.lay_people,
          createdAt,
          level: Level.LAYMAN,
        });
      } 
	  if (record.pre_med_students) {
        summariesForRecord.push({
          id: uuidv4(),
          text: record.input_text,
          summary: record.pre_med_students,
          createdAt,
          level: Level.PREMED,
        });
      }
      if (record.researchers) {
        summariesForRecord.push({
          id: uuidv4(),
          text: record.input_text,
          summary: record.researchers,
          createdAt,
          level: Level.RESEARCHER,
        });
      }
      if (record.experts_in_field) {
        summariesForRecord.push({
          id: uuidv4(),
          text: record.input_text,
          summary: record.experts_in_field,
          createdAt,
          level: Level.EXPERT,
        });
      }

      return summariesForRecord;
    });

    if (summaries.length === 0) {
      console.log("No summaries found to import.");
      return;
    }
	console.log(summaries.map(s => s.id));
    console.log(`Importing ${summaries.length} summaries...`);
	const result = await prisma.textSummary.createMany({
	        data: summaries,
	  skipDuplicates: true,
  });

    console.log(`Successfully imported ${result.count} summaries.`);
  } catch (error) {
    console.error("Error importing summaries:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Entry point
if (process.argv.length < 3) {
  console.error("Please provide a path to the CSV file");
  console.error("Usage: npx ts-node scripts/import-summaries.ts path/to/file.csv");
  process.exit(1);
}

const filePath = process.argv[2];

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

importSummaries(filePath)
  .then(() => {
    console.log("Import process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import process failed:", error);
    process.exit(1);
  });
