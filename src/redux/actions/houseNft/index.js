// Import Constants
import {
    ALLHOUSENFTS,
    ALLMYNFTS
} from '../../constants'

export const setAllHouseNFTs = (nfts) => {
    return dispatch => {
        return dispatch({
            type: ALLHOUSENFTS,
            data: nfts
        })
    }
}

export const setAllMyNFTs = (nfts) => {
    return dispatch => {
        return dispatch({
            type: ALLMYNFTS,
            data: nfts
        })
    }
}