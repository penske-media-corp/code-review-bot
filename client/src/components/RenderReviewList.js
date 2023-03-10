import DataTable,
    {
        createTheme
    } from 'react-data-table-component';
import {
    useCallback,
    useEffect,
    useState
} from 'react';
import {format} from 'date-fns';
import {useExpandedRowComponent} from './ExpandedRowComponent';

// @TODO: Need to setup .env & read from config.js
const JIRA_TICKET_BASE_URL = 'https://penskemedia.atlassian.net/browse';

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
        name: 'Jira Ticket',
        selector: row => row.jiraTicket && <a href={`${JIRA_TICKET_BASE_URL}/${row.jiraTicket}`}>{row.jiraTicket}</a>,
        maxWidth: '7em',
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
            fontSize: '1.1em',
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

    /**
     * Fetch the list of code review.
     *
     * @param {string} channel
     * @param {number} limit
     * @param {number} page
     * @param {string} status
     * @returns void
     */
    const updateFilter = ({channel, limit, page, status}) => {
        setLoading(true);
        fetch(`/api/reviews/${channel}/${status}?limit=${limit}&page=${page}`, {
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((result) => {
                if (!result) {
                    return;
                }
                setDataSet(result.dataset);
                setTotalRows(result.total);
                setLoading(false);
            });
    };

    const handleRowUpdate = useCallback(({data, action}) => {
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
    }, [channel, currentPage, pageSize, status]);

    useEffect(() => {
        updateFilter({
            channel,
            limit: pageSize,
            page: currentPage,
            status,
        });
    }, [channel, currentPage, pageSize, status]);

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
                onChangeRowsPerPage={setPageSize}
                onChangePage={setCurrentPage}

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
