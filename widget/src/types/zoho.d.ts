declare const ZOHO: {
  CREATOR: {
    DATA: {
      addRecords(config: {
        app_name?: string;
        form_name: string;
        payload: { data: Record<string, unknown> };
        skip_workflow?: string[];
      }): Promise<{ code: number; data: { ID: string }; message: string }>;

      getRecords(config: {
        app_name?: string;
        report_name: string;
        criteria?: string;
        field_config?: string;
        fields?: string;
        max_records?: number;
        record_cursor?: string;
      }): Promise<{ code: number; data: Record<string, unknown>[] }>;

      getRecordById(config: {
        app_name?: string;
        report_name: string;
        id: string;
      }): Promise<{ code: number; data: Record<string, unknown> }>;

      getRecordCount(config: {
        app_name?: string;
        report_name: string;
        criteria?: string;
      }): Promise<{ code: number; result: { records_count: string } }>;

      updateRecordById(config: {
        app_name?: string;
        report_name: string;
        id: string;
        payload: { data: Record<string, unknown> };
      }): Promise<{ code: number; data: Record<string, unknown>; message: string }>;

      updateRecords(config: {
        app_name?: string;
        report_name: string;
        process_until_limit?: string;
        payload: { criteria: string; data: Record<string, unknown>; skip_workflow?: string[] };
      }): Promise<{ code: number; result: unknown }>;

      deleteRecordById(config: {
        app_name?: string;
        report_name: string;
        id: string;
      }): Promise<{ code: number; data: Record<string, unknown>; message: string }>;

      invokeCustomApi(config: {
        api_name: string;
        workspace_name?: string;
        http_method: string;
        content_type?: string;
        payload?: Record<string, unknown>;
        query_params?: Record<string, string>;
        public_key?: string;
      }): Promise<{ code: number; result: unknown }>;
    };

    META: {
      getApplications(): Promise<{ code: number; applications: unknown[] }>;
      getForms(config: { app_name?: string }): Promise<unknown>;
      getReports(config: { app_name: string }): Promise<unknown>;
      getFields(config: { app_name?: string; form_name: string }): Promise<unknown>;
    };

    UTIL: {
      getInitParams(): Promise<{
        appLinkName: string;
        scope: string;
        envUrlFragment: string;
        loginUser: string;
      }>;
      getQueryParams(): Promise<Record<string, string>>;
      getWidgetParams(): Promise<Record<string, string>>;
      navigateParentURL(config: { action: string; url?: string; window?: string }): void;
    };
  };
};
