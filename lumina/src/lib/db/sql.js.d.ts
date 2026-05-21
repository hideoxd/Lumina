declare module 'sql.js' {
  type SqlValue = string | number | null | Uint8Array;
  type BindParams = SqlValue[] | Record<string, SqlValue>;

  class Statement {
    constructor(stmt: number, db: Database);
    bind(values?: BindParams): boolean;
    step(): boolean;
    getAsObject(params?: BindParams): Record<string, SqlValue>;
    getColumnNames(): string[];
    free(): boolean;
    reset(): boolean;
    run(values?: BindParams): void;
    get(params?: BindParams, config?: { useBigInt?: boolean }): SqlValue[];
  }

  interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
  }

  interface SqlJsConfig {
    locateFile: (file: string) => string;
  }

  class Database {
    constructor(data?: Uint8Array);
    run(sql: string, params?: BindParams): Database;
    exec(sql: string, params?: BindParams): QueryExecResult[];
    prepare(sql: string, params?: BindParams): Statement;
    export(): Uint8Array;
    close(): void;
    handleError(f: number): null;
    getRowsModified(): number;
    each(
      sql: string,
      params: BindParams | undefined,
      callback: (row: Record<string, SqlValue>) => void,
      done?: () => void,
    ): Database;
    iterateStatements(sql: string): StatementIterator;
    create_function(name: string, func: (...args: unknown[]) => unknown): Database;
  }

  interface StatementIteratorResult {
    done: boolean;
    value: Statement | undefined;
  }

  class StatementIterator {
    constructor(sql: string, db: Database);
    next(): StatementIteratorResult;
    getRemainingSQL(): string;
  }

  interface SqlJsStatic {
    Database: typeof Database;
    Statement: typeof Statement;
  }

  export type { Database, Statement, SqlValue, BindParams, QueryExecResult };

  export default function initSqlJs(config?: Partial<SqlJsConfig>): Promise<SqlJsStatic>;
}
