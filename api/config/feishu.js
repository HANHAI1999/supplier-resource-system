// Server-only configuration. Values here must never be imported by frontend code.
export const feishuConfig = {
  appToken: process.env.FEISHU_BITABLE_APP_TOKEN || 'J5TVb7bHLaI06PsgH93cA7Munxf',
  tables: {
    suppliers: process.env.BITABLE_MAIN || 'tblndLOjuXpeDmwu',
    configs: process.env.BITABLE_CONFIG || 'tbl7G3TXyWLmFstG',
    contacts: process.env.BITABLE_CONTACT || 'tblX3SBTCWN68ZVd',
    exceptions: process.env.BITABLE_EXCEPTION || 'tblhWiDbh7QT41rq',
    registrations: process.env.BITABLE_APPLY || 'tbl1ZKWtQriAItY1',
  },
}
