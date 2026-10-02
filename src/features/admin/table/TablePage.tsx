import { Navigate, useParams } from 'react-router-dom';
import { TableView } from './TableView';
import { CellWriteProvider } from './edit/CellWriteProvider';
import { isTableId, tableHref } from './tablePaths';

/**
 * One table of the Table section, at `/console/table/:table/:row?`.
 *
 * One route for a table with or without a row open (AdminPages), so this
 * page stays mounted as rows open and close, and the grid keeps its scroll;
 * `TableView` is the table itself.
 *
 * The cell writes (`CellWriteProvider`) sit above it: the page stays
 * mounted as another table opens too, so a write in flight — and the undo
 * stack — outlast a move from Songs to Artists.
 */
export const TablePage = () => {
  const { table } = useParams();

  // An unknown table goes to the first one, visibly — never a table quietly
  // standing in for the one the URL asked for. Its search is dropped: a sort
  // or filter chosen for another table means nothing on artists.
  if (!isTableId(table)) return <Navigate replace to={tableHref('artists')} />;

  return (
    <CellWriteProvider>
      <TableView table={table} />
    </CellWriteProvider>
  );
};
