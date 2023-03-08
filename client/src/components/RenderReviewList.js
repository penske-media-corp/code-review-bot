import DataTable, {createTheme} from 'react-data-table-component';
import React from 'react';
import {format} from 'date-fns';
import Select from 'react-select';
import styled from 'styled-components';

const logDebug = (...args) => {
    console.debug(...args);
}

const HeaderDiv = styled.div`
      min-width: 350px;
      width: 25%;
      flex-grow: 1;
    `;

// @see https://react-data-table-component.netlify.app/?path=/docs/api-columns--page
const columns = [
    {
        name: 'Date',
        selector: row => format(new Date(row.createdAt), 'MMM dd, yyyy hh:mmaaaaa'),
        maxWidth: '12em',
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
];

// @seet https://react-data-table-component.netlify.app/?path=/docs/pagination-options--options
const paginationComponentOptions = {
    rowsPerPageText: 'Rows per page',
    rangeSeparatorText: 'of',
    selectAllRowsItem: false,
};

const useExpandedRowComponent = (updatedHandler) => {
    const expandedRowComponent = ({data}) => {
        const handleClick = ({target}) => {
            const {name, value} = target;

            fetch(`/api/action/${name}/${value}`,{
                credentials: 'same-origin',
            })
                .then((res) => res.json())
                .then((result) => {
                    result?.data && updatedHandler && updatedHandler({
                        data: result.data,
                        action: name,
                    });
                })
                .catch((e) => {
                    // @TODO
                    logDebug(e);
                })
        };
        const Button = ({id, name}) => {
            const sanitizedName = name.toLowerCase().replace(' ', '-');

            return (
                <button
                    id={`${sanitizedName}-${id}`}
                    name={sanitizedName}
                    value={id}
                    onClick={handleClick}
                >{name}</button>
            );
        };
        return (
            <div style={{paddingLeft: '3em'}}>
                <div>
                    <Button name="Claim" id={data.id}/>
                    <Button name="Change Request" id={data.id}/>
                    <Button name="Approve" id={data.id}/>
                    <Button name="Close" id={data.id}/>
                    <Button name="Remove" id={data.id}/>
                </div>
                <pre>{data.note}</pre>
            </div>
        );
    };
    return expandedRowComponent;
}

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

const RenderReviewList = () => {
    let lastFetchData;
    let lastFetchChannel;
    const queryString = new URLSearchParams(window.location.search);
    const status = queryString.get('status') ?? 'pending';
    const [dataSet, setDataSet] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [totalRows, setTotalRows] = React.useState(0);
    const [pageSize, setPageSize] = React.useState(10);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [channelOptions, setChannelOptions] = React.useState([]);
    const [selectedChannel, setSelectedChannel] = React.useState(queryString.get('channel') ?? 'all');
    const [selectPlaceHolder, setSelectPlaceHolder] = React.useState('Code Reviews For All Slack Channels');

    const fetchData = async ({channel, limit, page, status, description}) => {
        // Check last fetch to avoid data request multiple times during first page loading.
        const newFetchData = `${channel}-${limit}-${page}-${status}`;
        if (lastFetchData && lastFetchData === newFetchData) {
            return;
        }
        logDebug('fetchData', description, lastFetchData, newFetchData)
        lastFetchData = `${channel}-${limit}-${page}-${status}`;
        setLoading(true);
        fetch(`/api/reviews/${channel}/${status}?limit=${limit}&page=${page}`, {
            credentials: 'same-origin',
        })
            .then((res) => res.json())
            .then((result) => {
                setDataSet(result.dataset);
                setTotalRows(result.total);
                setLoading(false);
            });
    };

    const handlePageChange = React.useCallback((page) => {
        logDebug('handlePageChange', page);
        setCurrentPage(page);
        fetchData({
            channel: selectedChannel,
            limit: pageSize,
            page,
            status,
            description: 'handlePageChange',
        });
    });

    const handlePageSizeChange = React.useCallback(async (newPageSize, page) => {
        logDebug('handlePerRowsChange', newPageSize, page);
        setPageSize(newPageSize);
        fetchData({
            channel: selectedChannel,
            limit: newPageSize,
            page,
            status,
            description: 'handlePageSizeChange',
        });
    });

    const handleChannelSelectionChange = React.useCallback((data) => {
        console.log('handleChannelSelectionChange', data);
        const { label } = channelOptions.find(({ value }) => value === data?.value) || {};
        if (label !== selectPlaceHolder) {
            setSelectedChannel(data.value);
            setSelectPlaceHolder(label);
            fetchData({
                channel: data.value,
                limit: pageSize,
                page: currentPage,
                status,
                description: 'handleChannelSelectionChange',
            });
        }
    });

    const handleRowUpdate = React.useCallback(({data, action}) => {
        logDebug('handleRowUpdate', data.id);

        if (data?.status === status) {
            // If row data status is the same, just need to trigger data refresh and render
            const newDataSet = dataSet.map((row) => row.id === data.id ? data : row);
            setDataSet(newDataSet);
        } else {
            fetchData({
                channel: selectedChannel,
                limit: pageSize,
                page: currentPage,
                status,
                description: 'handleRowUpdate',
            });
        }
    });

    React.useEffect(() => {
        // Channel list should never be change, should only fetch once.
        if (lastFetchChannel) {
            return;
        }
        lastFetchChannel = true;
        fetch(`/api/channels`)
            .then((res) => res.json())
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
                fetchData({
                    channel: selectedChannel,
                    limit: pageSize,
                    page: currentPage,
                    status,
                    description: 'useEffect',
                });
            });
    }, []);

    return (
        <div id="reviews-list">
            <HeaderDiv>
                <Select
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
                expandableRowsComponent={useExpandedRowComponent(handleRowUpdate)}
            />
        </div>
    );
};

export default RenderReviewList;
