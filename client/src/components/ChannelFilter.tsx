import Select, {SingleValue} from 'react-select';
import React from 'react';
import styled from 'styled-components';
import {useCallback, useEffect, useState} from 'react';
import {fetchData} from '../services/fetch';

const FilterDiv = styled.div`
      min-width: 350px;
      max-width: 50%;
      flex-grow: 1;
    `;

const ChannelFilter = ({onSelected, selectedChannel}: { onSelected: CallableFunction; selectedChannel: string; }) => {
    const [channelOptions, setChannelOptions] = useState([] as { label: string; value: string; }[]);
    const [selectPlaceHolder, setSelectPlaceHolder] = useState('Code Reviews For All Slack Channels');
    const handleChannelSelectionChange = useCallback((data: SingleValue<{ label: string; value: string; }>) => {
        const { label } = channelOptions.find(({ value }) => value === data?.value) || {};
        if (label !== selectPlaceHolder) {
            setSelectPlaceHolder(label ?? '');
            onSelected && onSelected(data?.value);
        }
    }, []);

    useEffect(() => {
        fetchData('/api/channels')
            .then((result) => {
                const options = [
                    {
                        label: 'Code Reviews For All Slack Channels',
                        value: 'all',
                    }
                ];

                result.forEach((item: {id: string; name: string}) => {
                    const option = {
                        label: `Code Reviews For Channel "#${item.name}"`,
                        value: item.id,
                    };

                    options.push(option);
                    if (selectedChannel !== 'all' && [item.id, item.name].includes(selectedChannel)) {
                        setSelectPlaceHolder(option.label);
                        if (selectedChannel !== item.id) {
                            onSelected && onSelected(selectedChannel);
                        }
                    }
                });
                setChannelOptions(options);
            });
    }, []);

    return (
        <FilterDiv>
            <Select id="channel-filter"
                placeholder={selectPlaceHolder}
                options={channelOptions}
                onChange={handleChannelSelectionChange}
                styles={{option: (base) => ({...base, color: '#303030'})}}
            />
        </FilterDiv>
    );
};

export default ChannelFilter;
