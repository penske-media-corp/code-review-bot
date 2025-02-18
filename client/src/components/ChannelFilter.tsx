import Select, {SingleValue} from 'react-select';
import React from 'react';
import styled from 'styled-components';
import {useCallback, useEffect, useState} from 'react';
import {fetchData} from '../services/fetch';

export interface ChannelFilterProps {
    onSelected: CallableFunction;
    selectedChannel: string;
}

interface Channel {
    id: string;
    name: string;
}

interface Option {
    label: string;
    value: string;
}

const FilterDiv = styled.div`
      min-width: 350px;
      max-width: 50%;
      flex-grow: 1;
    `;

const ChannelFilter = ({onSelected, selectedChannel}: ChannelFilterProps) => {
    const [channelOptions, setChannelOptions] = useState([] as Option[]);
    const [selectPlaceHolder, setSelectPlaceHolder] = useState('Code Reviews For All Slack Channels');
    const handleChannelSelectionChange = useCallback((data: SingleValue<Option>) => {
        if (data?.label && data?.value) {
            setSelectPlaceHolder(data.label);
            onSelected(data.value);
        }
    }, [onSelected]);

    useEffect(() => {
        let hasBeenDestroyed = false;

        fetchData('/api/channels')
            .then((result) => {
                if (hasBeenDestroyed) {
                    return;
                }
                const options: Option[] = [
                    {
                        label: 'Code Reviews For All Slack Channels',
                        value: 'all',
                    },
                    ...result.map((channel: Channel) => {
                        return {
                            label: `Code Reviews For Channel "#${channel.name}"`,
                            value: channel.id,
                        }
                    }),
                ];

                setChannelOptions(options);

                // This code is to work around to display current selected channel as a placeholder
                // @TODO: revisit on how to pass in the default value to <Select> after the options are set.
                if (selectedChannel === 'all') {
                  return;
                }

                const findChannel = result.find((channel: Channel) => [channel.id, channel.name].includes(selectedChannel))
                if (findChannel) {
                    setSelectPlaceHolder(`Code Reviews For Channel "#${findChannel.name}"`);
                    if (selectedChannel !== findChannel.id) {
                        onSelected(findChannel.id);
                    }
                }
            });

        return () => {
            hasBeenDestroyed = true;
        };
    }, [onSelected, selectedChannel]);

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
