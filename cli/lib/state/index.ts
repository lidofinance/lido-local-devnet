import { promises as fs } from "fs";
import { dirname } from "path";

interface DataStructure {
  [key: string]: any;
}

type Path = string | (string | number)[];
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

  async getReader() {
    const state = await this.read();
    return new JsonDbReader(state);
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

class JsonDbReader<T> {
  state!: T;
  constructor(state: T) {
    this.state = state;
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

  public get(path: Path): any {
    try {
      return this.getOrError(path);
    } catch (_) {}
  }
}
