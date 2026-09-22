// Server-only configuration. Values here must never be imported by frontend code.
export const feishuConfig = {
  appToken: process.env.FEISHU_BITABLE_APP_TOKEN,
  tables: {
    suppliers: 'tblwsO01PKRwtixX',
    domesticConfigs: 'tblKTtaWig45McGC',
    usConfigs: 'tblQkEBpzurYQYfs',
    contacts: 'tbl1LL50RKhrUCkO',
    warehouses: 'tblY9xJsUo0ZbEgY',
    exceptions: 'tblczwSM3vnqQdui',
    registrations: 'tbleHbXRI60PTp8M',
    permissions: 'tblvWkFJRV7sQ9Pn',
    exportAudits: 'tblHt9MAjmVIsyo9',
  },
}
