import { promises as fs } from "fs";
import { dirname } from "path";

interface DataStructure {
  [key: string]: any;
}

export class JsonDb {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async read(): Promise<DataStructure> {
    try {
      const data = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(data);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("File not found, returning empty object.");
        return {};
      } else {
        throw error;
      }
    }
  }

  async write(data: DataStructure): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  async update(value: any): Promise<void> {
    const data = await this.read();
    await this.write({ ...data, ...value });
  }

  async clean(): Promise<void> {
    await this.write({});
  }
}
