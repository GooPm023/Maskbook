import { Dispatch, memo, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import { Box, Stack, TablePagination } from '@mui/material'
import { makeStyles } from '@masknet/theme'
import { LoadingPlaceholder } from '../../../../components/LoadingPlaceholder'
import { EmptyPlaceholder } from '../EmptyPlaceholder'
import { CollectibleCard } from '../CollectibleCard'
import { useDashboardI18N } from '../../../../locales'
import { PluginMessages } from '../../../../API'
import { useNavigate } from 'react-router'
import { DashboardRoutes } from '@masknet/shared-base'
import { TransferTab } from '../Transfer'
import { useNetworkDescriptor, useWeb3State as useWeb3PluginState, Web3Plugin, useAccount } from '@masknet/plugin-infra'
import { useAsyncRetry } from 'react-use'

const useStyles = makeStyles()({
    root: {
        flex: 1,
        padding: '24px 26px 0px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, 140px)',
        gridGap: '20px',
        justifyContent: 'space-between',
    },
    card: {},
    footer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
})

interface CollectibleListProps {
    selectedNetwork: Web3Plugin.NetworkDescriptor | null
}

const ITEM_SIZE = {
    width: 150,
    height: 250,
}

export const CollectibleList = memo<CollectibleListProps>(({ selectedNetwork }) => {
    const [page, setPage] = useState(0)
    const navigate = useNavigate()
    const account = useAccount()
    const { Asset } = useWeb3PluginState()
    const network = useNetworkDescriptor()
    const [loadingSize, setLoadingSize] = useState<number>()
    const [loadingCollectible, setLoadingCollectible] = useState(true)
    const [renderData, setRenderData] = useState<Web3Plugin.NonFungibleToken[]>([])

    const {
        value = { data: [], hasNextPage: false },
        error: collectiblesError,
        retry,
    } = useAsyncRetry(
        async () =>
            Asset?.getNonFungibleAssets?.(account, { page: page, size: 20 }, undefined, selectedNetwork ?? undefined),
        [account, Asset, network, selectedNetwork],
    )

    useEffect(() => {
        if (!loadingSize) return
        const render = value.data.slice(page * loadingSize, (page + 1) * loadingSize)
        setRenderData(render)
    }, [value, loadingSize, page])

    const onSend = useCallback(
        (detail: Web3Plugin.NonFungibleToken) =>
            navigate(DashboardRoutes.WalletsTransfer, {
                state: {
                    type: TransferTab.Collectibles,
                    erc721Token: detail,
                },
            }),
        [],
    )

    useEffect(() => {
        PluginMessages.Wallet.events.erc721TokensUpdated.on(() => retry())
        PluginMessages.Wallet.events.socketMessageUpdated.on((info) => {
            if (!info.done) {
                retry()
            }
            setLoadingCollectible(false)
        })
    }, [retry])

    const hasNextPage = (page + 1) * (loadingSize ?? 0) < value.data.length

    return (
        <CollectibleListUI
            isLoading={renderData.length === 0 && loadingCollectible}
            isEmpty={
                (!!collectiblesError || renderData.length === 0) && !(renderData.length === 0 && loadingCollectible)
            }
            page={page}
            onPageChange={setPage}
            hasNextPage={hasNextPage}
            showPagination={!loadingCollectible && !(page === 0 && !hasNextPage)}
            dataSource={renderData}
            chainId={network?.chainId ?? 1}
            onSend={onSend}
            setLoadingSize={(size) => setLoadingSize(size)}
        />
    )
})

export interface CollectibleListUIProps {
    page: number
    onPageChange: Dispatch<SetStateAction<number>>
    hasNextPage: boolean
    isLoading: boolean
    isEmpty: boolean
    showPagination: boolean
    chainId: number
    dataSource: Web3Plugin.NonFungibleToken[]
    onSend(detail: Web3Plugin.NonFungibleToken): void
    setLoadingSize(fn: (pre: number | undefined) => number): void
}

export const CollectibleListUI = memo<CollectibleListUIProps>(
    ({
        page,
        onPageChange,
        isLoading,
        isEmpty,
        hasNextPage,
        showPagination,
        chainId,
        dataSource,
        onSend,
        setLoadingSize,
    }) => {
        const t = useDashboardI18N()
        const { classes } = useStyles()
        const ref = useRef<HTMLDivElement>(null)

        useEffect(() => {
            if (!ref.current) return
            const width = ref.current.offsetWidth
            const height = ref.current.offsetHeight - 60
            const baseSize = Math.floor(width / ITEM_SIZE.width) * Math.floor(height / ITEM_SIZE.height)
            setLoadingSize((prev) => prev ?? Math.floor(baseSize * 0.8))
        }, [ref.current])

        return (
            <Stack flexDirection="column" justifyContent="space-between" height="100%" ref={ref}>
                <>
                    {isLoading ? (
                        <LoadingPlaceholder />
                    ) : isEmpty ? (
                        <EmptyPlaceholder children={t.wallets_empty_collectible_tip()} />
                    ) : (
                        <Box>
                            <div className={classes.root}>
                                {dataSource.map((x) => (
                                    <div className={classes.card} key={x.id}>
                                        <CollectibleCard
                                            chainId={chainId}
                                            token={x}
                                            // TODO: transfer not support multi chain, should remove is after supported
                                            onSend={() => onSend(x as unknown as any)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </Box>
                    )}
                </>
                {showPagination ? (
                    <Box className={classes.footer}>
                        <TablePagination
                            count={-1}
                            component="div"
                            onPageChange={() => {}}
                            page={page}
                            rowsPerPage={20}
                            rowsPerPageOptions={[20]}
                            labelDisplayedRows={() => null}
                            backIconButtonProps={{
                                onClick: () => onPageChange((prev) => prev - 1),
                                size: 'small',
                                disabled: page === 0,
                            }}
                            nextIconButtonProps={{
                                onClick: () => onPageChange((prev) => prev + 1),
                                disabled: !hasNextPage,
                                size: 'small',
                            }}
                        />
                    </Box>
                ) : null}
            </Stack>
        )
    },
)
