import { Record } from "runtypes";
import { v4 as uuidv4 } from "uuid";
import { EntityNotFoundError } from "../errors";

export type UUID = string;
export type DataEntity<T> = T & {
  id: string;
  created: string;
  updated: string;
};

abstract class BaseRepository<T> {
  // normally there's stuff in here which helps to establish a common repository method
  // for example: connection pooling, transaction utilities, client initialization, whatever you want to be shared, really
  private readonly internalMockDataStore: Map<UUID, DataEntity<T>>;

  constructor(private readonly idPrefix = "platform_") {
    this.internalMockDataStore = new Map();
  }

  protected generateUuid(): UUID {
    return uuidv4();
  }

  async create(data: T): Promise<DataEntity<T>> {
    const generatedUuid = this.generateUuid();
    const currentDate = new Date();
    const id = this.idPrefix + generatedUuid;
    const dataToSave: DataEntity<T> = {
      ...data,
      id: id,
      created: currentDate.toISOString(),
      updated: currentDate.toISOString(),
    };
    this.internalMockDataStore.set(id, dataToSave);
    return dataToSave;
  }

  async read(id: UUID): Promise<DataEntity<T> | undefined> {
    return this.internalMockDataStore.get(id);
  }

  async update(id: UUID, newData: T) {
    const existingData = this.internalMockDataStore.get(id);
    if (!existingData) {
      throw new EntityNotFoundError("Cannot find ID");
    }
    const { id: existingId, created, updated, ...oldData } = existingData;
    const newUpdated = new Date().toISOString();
    const updatedData: DataEntity<T> = {
      ...Object.assign(oldData, newData),
      id: existingId,
      created,
      updated: newUpdated,
    };
    this.internalMockDataStore.set(id, updatedData);
  }

  async delete(id: UUID) {
    this.internalMockDataStore.delete(id);
  }

  async scan(): Promise<Array<DataEntity<T>>> {
    return Array.from(this.internalMockDataStore.values());
  }
}

export default BaseRepository;
