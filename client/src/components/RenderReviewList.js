import DataTable,
    {
        createTheme
    } from 'react-data-table-component';
import {
    useCallback,
    useEffect,
    useState
} from 'react';
import {fetchReviews} from '../services/data';
import {format} from 'date-fns';
import {logDebug} from '../services/log';
import {useExpandedRowComponent} from './ExpandedRowComponent';

// @see https://react-data-table-component.netlify.app/?path=/docs/api-columns--page
const columns = [
    {
        name: 'Date',
        selector: row => format(new Date(row.createdAt), 'MMM dd, yyyy'),
        maxWidth: '7em',
        compact: true,
    },
    {
        name: 'Owner',
        selector: row => row.owner,
        maxWidth: '12em',
        compact: true,
    },
    {
        name: 'Pull Request',
        selector: row => <a href={row.pullRequestLink}>{row.pullRequestLink.replace(/.*\/(.*?\/pull\/\d+)/,'$1')}</a>,
        maxWidth: '20em',
        compact: true,
    },
    {
        name: 'Slack Link',
        selector: row => <a href={row.slackPermalink}>{row.slackThreadTs}</a>,
        maxWidth: '12em',
        compact: true,
    },
    {
        name: 'Reviewers',
        selector: row => row.reviewers?.join(', '),
        wrap: true,
        compact: true,
    },
    {
        name: 'Approvers',
        selector: row => row.approvers?.join(', '),
        wrap: true,
        compact: true,
    },
    {
        name: 'Request Changes',
        selector: row => row.requestChanges?.join(', '),
        wrap: true,
        compact: true,
    },
];

// @seet https://react-data-table-component.netlify.app/?path=/docs/pagination-options--options
const paginationComponentOptions = {
    rowsPerPageText: 'Rows per page',
    rangeSeparatorText: 'of',
    selectAllRowsItem: false,
};

const customStyles = {
    header: {
        style: {
            backgroundColor: '#555555',
            color: '#eeeeee',
        },
    },
    headRow: {
        style: {
            backgroundColor: '#505050',
            color: 'white',
            fontSize: '1.2em',
        },
    },
    expanderRow: {
        style: {
            backgroundColor: '#252525',
        }
    }
};

createTheme('custom', {
    text: {
        primary: '#c0c0c0',
        secondary: '#c0c0c0',
    },
    background: {
        default: '#303030',
    },
    divider: {
        default: '#505050',
    },
    striped: {
        default: '#353535',
    },
    highlightOnHover: {
        default: '#404040',
    }
}, 'dark');

const RenderReviewList = (props) => {
    const {channel, status, user} = props;
    const [dataSet, setDataSet] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);

    const updateFilter = ({channel, limit, page, status}) => {
        setLoading(true);
        fetchReviews({channel, limit, page, status})
            .then((result) => {
                if (!result) {
                    return;
                }
                setDataSet(result.dataset);
                setTotalRows(result.total);
                setLoading(false);
            });
    };

    const handlePageChange = useCallback((page) => {
        logDebug('handlePageChange', page);
        setCurrentPage(page);
        updateFilter({
            channel,
            limit: pageSize,
            page,
            status,
        });
    });

    const handlePageSizeChange = useCallback(async (newPageSize, page) => {
        logDebug('handlePerRowsChange', newPageSize, page);
        setPageSize(newPageSize);
        updateFilter({
            channel,
            limit: newPageSize,
            page,
            status,
        });
    });

    const handleRowUpdate = useCallback(({data, action}) => {
        logDebug('handleRowUpdate', data.id);

        if (data?.status === status) {
            // If row data status is the same, just need to trigger data refresh and render
            const newDataSet = dataSet.map((row) => row.id === data.id ? data : row);
            setDataSet(newDataSet);
        } else {
            updateFilter({
                channel,
                limit: pageSize,
                page: currentPage,
                status,
            });
        }
    });

    useEffect(() => {
        updateFilter({
            channel,
            limit: pageSize,
            page: currentPage,
            status,
        });
    }, [channel, status]);

    return (
        <div id="reviews-list">
            <DataTable
                customStyles={customStyles}
                theme="custom"
                columns={columns}
                data={dataSet}
                progressPending={loading}
                paginationPerPage={pageSize}
                paginationRowsPerPageOptions={[10,20,30,50,100]}
                pagination
                paginationServer
                paginationTotalRows={totalRows}
                paginationComponentOptions={paginationComponentOptions}
                onChangeRowsPerPage={handlePageSizeChange}
                onChangePage={handlePageChange}

                fixedHeader
                striped
                highlightOnHover
                dense
                persistTableHead

                expandableRows
                expandableRowsComponent={useExpandedRowComponent({onUpdate: handleRowUpdate, user})}
            />
        </div>
    );
};

export default RenderReviewList;
