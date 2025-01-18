import { promises as fs } from "node:fs";
import { dirname } from "node:path";

interface DataStructure {
  [key: string]: any;
}

type Path = (number | string)[] | string;
export class JsonDb {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async clean(): Promise<void> {
    await this.write({});
  }

  async getReader() {
    const state = await this.read();
    return new JsonDbReader(state);
  }

  async read(): Promise<DataStructure> {
    try {
      const data = await fs.readFile(this.filePath, "utf8");
      return JSON.parse(data);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("File not found, returning empty object.");
        return {};
      }
 
        throw error;
      
    }
  }

  async update(value: any): Promise<void> {
    const data = await this.read();
    await this.write({ ...data, ...value });
  }

  async write(data: DataStructure): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

class JsonDbReader<T> {
  state!: T;
  constructor(state: T) {
    this.state = state;
  }

  public get(path: Path): any {
    try {
      return this.getOrError(path);
    } catch {}
  }

  public getOrError(path: Path): any {
    const keys = typeof path === "string" ? path.split(".") : path;
    let result: any = this.state;

    for (const key of keys) {
      if (
        result === undefined ||
        result === null ||
        typeof result !== "object"
      ) {
        throw new Error(`Property not found: ${keys.join(".")}`);
      }

      result = result[key];
    }

    if (result === undefined) {
      throw new Error(`Property not found: ${keys.join(".")}`);
    }

    return result;
  }
}
