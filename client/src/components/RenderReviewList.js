import DataTable,
    {
        createTheme
    } from 'react-data-table-component';
import Select from 'react-select';
import {
    fetchChannel,
    fetchReviews
} from '../services/data';
import {
    useCallback,
    useEffect,
    useState
} from 'react';
import {format} from 'date-fns';
import {logDebug} from '../services/log';
import styled from 'styled-components';
import {useExpandedRowComponent} from './ExpandedRowComponent';

const HeaderDiv = styled.div`
      min-width: 350px;
      width: 25%;
      flex-grow: 1;
    `;

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
    const {user} = props;
    const queryString = new URLSearchParams(window.location.search);
    const status = queryString.get('status') ?? 'pending';
    const [dataSet, setDataSet] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalRows, setTotalRows] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [channelOptions, setChannelOptions] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState(queryString.get('channel') ?? 'all');
    const [selectPlaceHolder, setSelectPlaceHolder] = useState('Code Reviews For All Slack Channels');

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
            channel: selectedChannel,
            limit: pageSize,
            page,
            status,
        });
    });

    const handlePageSizeChange = useCallback(async (newPageSize, page) => {
        logDebug('handlePerRowsChange', newPageSize, page);
        setPageSize(newPageSize);
        updateFilter({
            channel: selectedChannel,
            limit: newPageSize,
            page,
            status,
        });
    });

    const handleChannelSelectionChange = useCallback((data) => {
        console.log('handleChannelSelectionChange', data);
        const { label } = channelOptions.find(({ value }) => value === data?.value) || {};
        if (label !== selectPlaceHolder) {
            setSelectedChannel(data.value);
            setSelectPlaceHolder(label);
            updateFilter({
                channel: data.value,
                limit: pageSize,
                page: currentPage,
                status,
            });
        }
    });

    const handleRowUpdate = useCallback(({data, action}) => {
        logDebug('handleRowUpdate', data.id);

        if (data?.status === status) {
            // If row data status is the same, just need to trigger data refresh and render
            const newDataSet = dataSet.map((row) => row.id === data.id ? data : row);
            setDataSet(newDataSet);
        } else {
            updateFilter({
                channel: selectedChannel,
                limit: pageSize,
                page: currentPage,
                status,
            });
        }
    });

    useEffect(() => {
        fetchChannel()
            .then((result) => {
                const options = [
                    {
                        label: 'Code Reviews For All Slack Channels',
                        value: 'all',
                    }
                ];

                result.forEach((item) => {
                    const option = {
                        label: `Code Reviews For Channel "#${item.name}"`,
                        value: item.id,
                    };

                    options.push(option);
                    if (selectedChannel !== 'all' && [item.id, item.name].includes(selectedChannel)) {
                        setSelectPlaceHolder(option.label);
                        if (selectedChannel !== item.id) {
                            setSelectedChannel(selectedChannel);
                        }
                    }
                });
                setChannelOptions(options);
            })
            .finally(() => {
                updateFilter({
                    channel: selectedChannel,
                    limit: pageSize,
                    page: currentPage,
                    status,
                });
            });
    }, []);

    return (
        <div id="reviews-list">
            <HeaderDiv>
                <Select id="channel-filter"
                    placeholder={selectPlaceHolder}
                    options={channelOptions}
                    onChange={handleChannelSelectionChange}
                    styles={{option: (base) => ({...base, color: '#303030'})}}
                    defaultValue=""
                    value={selectedChannel}
                />
            </HeaderDiv>
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
