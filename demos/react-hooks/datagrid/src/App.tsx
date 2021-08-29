import * as React from "react";
import "./App.css";
import { DataGrid } from "@material-ui/data-grid";
import { useWebQuery } from "./dist";
import { Response } from "./models";

const columns = [
  { field: "id", headerName: "ID", width: 90 },
  {
    field: "first_name",
    headerName: "First name",
    width: 150,
  },
  {
    field: "last_name",
    headerName: "Last name",
    width: 150,
  },
  {
    field: "email",
    headerName: "Email Address",
    width: 250,
  },
];

const App = () => {
  const [api, { loading, data }] = useWebQuery<{}, Response>();
  api.uri = "https://reqres.in/api/users?page=2";

  return (
    <DataGrid
      loading={loading}
      rows={data?.data ?? []}
      columns={columns}
      disableSelectionOnClick
      autoHeight
      pageSize={10}
    />
  );
};

export default App;
