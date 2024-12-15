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
    } catch (error) {
      console.error("Error reading the JSON file:", error);
      throw new Error("Failed to read data");
    }
  }

  async write(data: DataStructure): Promise<void> {
    try {
      await fs.mkdir(dirname(this.filePath), { recursive: true });
      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
      console.error("Error writing to the JSON file:", error);
      throw new Error("Failed to write data");
    }
  }

  async update(key: string, value: any): Promise<void> {
    const data = await this.read();
    data[key] = value;
    await this.write(data);
  }

  async clean(): Promise<void> {
    await this.write({});
  }
}
