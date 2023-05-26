import { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import LoadingButton from "@mui/lab/LoadingButton";
import { Box } from '@mui/system';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CachedIcon from '@mui/icons-material/Cached';
import { useWeb3React } from '@web3-react/core';
import useNftStyle from 'assets/styles/nftStyle';
import CryptoJS from 'crypto-js';
import { useHouseBusinessContract, useHouseDocContract } from 'hooks/useContractHelpers';
import { houseError, houseInfo, houseSuccess } from 'hooks/useToast';
import { useWeb3 } from 'hooks/useWeb3';
import { apiURL, secretKey, zeroAddress } from 'mainConfig';
import { setAllHouseNFTs } from 'redux/actions/houseNft';
import MoreDetail from './MoreDetail';

import styled from '@emotion/styled';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CancelIcon from '@mui/icons-material/Cancel';
import DoDisturbOffIcon from '@mui/icons-material/DoDisturbOff';
import DocumentIcon from '@mui/icons-material/DocumentScanner';
import EditIcon from '@mui/icons-material/Edit';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import { Avatar, CircularProgress, Grid, IconButton, ListItem, MenuItem, TextField } from '@mui/material';
import MenuList from '@mui/material/MenuList';
import ContractDetailDialog from 'components/ContractDetailDialog';
import useNftDetailStyle from 'assets/styles/nftDetailStyle';
import { decryptContract } from 'utils';
import Switch from '@mui/material/Switch';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';

const StyledInput = styled('input')({
  display: 'none',
});

const label = { inputProps: { 'aria-label': 'Switch demo' } };

function Dashboard(props) {
  const nftClasses = useNftStyle()
  const { account } = useWeb3React()
  const web3 = useWeb3()
  const dispatch = useDispatch();
  const { allNFTs } = props.houseNft;
  const classes = useNftDetailStyle();
  const walletAccount = props.account.account;
  const historyTypes = props.historyTypes.historyTypes;
  const houseBusinessContract = useHouseBusinessContract()
  const houseDocContract = useHouseDocContract();
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false);
  const [histories, setHistories] = useState([]);
  const [cContract, setCContract] = useState({});
  const [showCContract, setShowCContract] = useState(false);
  const [contracts, setContracts] = useState([]);
  const [showDataPoint, setShowDatapoint] = useState(false);

  const loadNFTs = async () => {
    var nfts = [];
    houseBusinessContract.methods.getAllHouses().call()
      .then(async (gNFTs) => {
        for (let i = 0; i < gNFTs.length; i++) {
          var bytes = CryptoJS.AES.decrypt(gNFTs[i].tokenURI, secretKey);
          var decryptedURI = bytes.toString(CryptoJS.enc.Utf8);
          var bytesName = CryptoJS.AES.decrypt(gNFTs[i].tokenName, secretKey);
          var decryptedName = bytesName.toString(CryptoJS.enc.Utf8);
          var bytesType = CryptoJS.AES.decrypt(gNFTs[i].tokenType, secretKey);
          var decryptedType = bytesType.toString(CryptoJS.enc.Utf8)
          var housePrice = await houseBusinessContract.methods.getHousePrice(gNFTs[i].houseID).call();
          nfts.push({
            ...gNFTs[i],
            price: housePrice,
            tokenURI: decryptedURI,
            tokenName: decryptedName,
            tokenType: decryptedType
          })
        }
        if (account) {
          var otherNFTs = [];
          for (var i = 0; i < nfts.length; i++) {
            if (nfts[i].contributor.currentOwner === `${account}`) continue;
            otherNFTs.push(nfts[i]);
          }
          dispatch(setAllHouseNFTs(otherNFTs));
        } else {
          dispatch(setAllHouseNFTs(nfts));
        }
      })
      .catch(err => console.log(err));
  }

  const handleBuyNFT = async (item) => {
    if (!walletAccount) {
      houseInfo("Please connect your wallet!")
    } else {
      setLoading(true);
      if (!account) {
        const data = houseBusinessContract.methods.buyHouseNft(item.houseID, walletAccount).encodeABI();
        const transactionObject = {
          data,
          to: houseBusinessContract.options.address,
          value: item.price
        }

        // Send trx data and sign
        fetch(`${apiURL}/signTransaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionObject,
            user: walletAccount
          }),
        })
          .then(async (res) => {
            if (res.status !== 200) {
              return res.json().then(error => {
                houseError(`Error: ${error.message}`);
                setLoading(false);
              });
            }
            houseSuccess("You bought successfully!")
            loadNFTs()
          })
          .catch(err => {
            houseError(err)
          });
      } else {
        try {
          await houseBusinessContract.methods.buyHouseNft(item.houseID, account).send({ from: account });
          houseSuccess("You bought successfully!")
          loadNFTs()
        } catch (err) {
          console.log('err', err)
        }
      }

      setLoading(false);
    }
  }

  const addAllowMe = async (item) => {
    try {
      await houseBusinessContract.methods.addAllowList(item.houseID, account).send({ from: account })
    } catch (err) {
      console.log('err', err)
    }
  }

  const handleClickMoreDetail = async (item) => {
    navigate(`../../item/${item.houseID}`)
  }

  const handleClickViewDatapoint = async () => {

  }

  const [open, setOpen] = useState(false);

  const handleClickOpen = async (_id, _owner) => {
    var chistories = await houseBusinessContract.methods.getHistory(_id).call();

    var tempHistory = [];
    for (let i = 0; i < chistories.length; i++) {
      var bytesOtherInfo = CryptoJS.AES.decrypt(chistories[i].otherInfo, secretKey);
      var decryptedHistory = bytesOtherInfo.toString(CryptoJS.enc.Utf8);
      var bytesBrandType = CryptoJS.AES.decrypt(chistories[i].brandType, secretKey);
      var decryptedBrandType = bytesBrandType.toString(CryptoJS.enc.Utf8);
      var bytesHouseBrand = CryptoJS.AES.decrypt(chistories[i].houseBrand, secretKey);
      var decryptedHouseBrand = bytesHouseBrand.toString(CryptoJS.enc.Utf8);
      var bytesDesc = CryptoJS.AES.decrypt(chistories[i].desc, secretKey);
      var decryptedDesc = bytesDesc.toString(CryptoJS.enc.Utf8);
      var bytesImg = CryptoJS.AES.decrypt(chistories[i].houseImg, secretKey);
      var decryptedImg = bytesImg.toString(CryptoJS.enc.Utf8);
      var yearField = chistories[i].flag ? chistories[i].yearField * -1 : chistories[i].yearField;
      tempHistory.push({
        ...chistories[i],
        otherInfo: decryptedHistory,
        brandType: decryptedBrandType,
        houseBrand: decryptedHouseBrand,
        desc: decryptedDesc,
        houseImg: decryptedImg,
        yearField: yearField
      });
    }
    console.log('tempHistory', tempHistory)
    setHistories(tempHistory);
    setOpen(true);

    var allContracts = await houseDocContract.methods.getDocContracts(_owner).call();
    console.log('allContracts', allContracts)
    var cArr = [];
    for (let i = 0; i < allContracts.length; i++) {
      const contract = decryptContract(allContracts[i]);
      cArr.push({
        ...contract,
        label: `${historyTypes[contract.contractType].hLabel} contract in ${contract.companyName}`,
      });
    }
    setContracts(cArr);
  };

  const handleClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    console.log('useEffect triggered with walletAccount:', walletAccount);
    if (walletAccount) {
      loadNFTs();
    }
  }, [walletAccount]);

  return (
    <Grid>
      <Box component={'h2'}>Dashboard</Box>
      <Grid container spacing={3}>
        {
          (allNFTs && allNFTs.length > 0) ? allNFTs.map((item) => {
            return (
              <Grid
                item
                xl={3}
                lg={4}
                md={6}
                sm={6}
                key={item.houseID}
                className={nftClasses.nftHouseItem}
              >
                <Grid className={nftClasses.nftHouseCard}>
                  <Grid className={nftClasses.nftHouseMedia}>
                    <img className={nftClasses.nftImg} src={item.tokenURI} />
                  </Grid>
                  <Grid>
                    <Box component={'h3'} className={nftClasses.nftHouseTitle}>{item.tokenName}</Box>
                  </Grid>
                  <Grid className={nftClasses.nftHouseMetaInfo}>
                    <Grid className={nftClasses.nftHouseInfo}>
                      <Box component={'span'}>Owned By</Box>
                      <Box component={'h4'} className={nftClasses.nftHouseOwner}>{item.contributor.currentOwner}</Box>
                    </Grid>
                    {web3.utils.fromWei(item.price) > 0 &&
                      <Grid className={nftClasses.nftHousePrice}>
                        <Box component={'span'}>Current Price</Box>
                        <Box component={'h4'}>{`${web3.utils.fromWei(item.price)} MATIC`}</Box>
                      </Grid>}
                  </Grid>
                  <Grid className={nftClasses.nftHouseBottom}>
                    {
                      item.contributor.currentOwner !== walletAccount && (item.contributor.buyer === zeroAddress || item.contributor.buyer === walletAccount) && item.nftPayable === true ?
                        <LoadingButton
                          variant='contained'
                          onClick={() => handleBuyNFT(item)}
                          loadingPosition="end"
                          disabled={loading}
                          className={nftClasses.nftHouseButton}
                          endIcon={<BusinessCenterIcon />}
                        >
                          <Box component={'span'} className={nftClasses.nftHouseBuyButton} textTransform={'capitalize'} >{`Buy NFT`}</Box>
                        </LoadingButton> : <></>
                    }
                    {/* <MoreDetail account={walletAccount} item={item} nftClasses={nftClasses} handleClickMoreDetail={handleClickMoreDetail} houseBusinessContract={houseBusinessContract} /> */}
                    <Box
                      component={'a'}
                      className={nftClasses.nftHouseHistory}
                      onClick={() => handleClickOpen(item.houseID, item.contributor.currentOwner)}
                    >
                      <CachedIcon />
                      {`View Datapoint`}
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
            )
          }) : ''
        }
      </Grid>

      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        maxWidth='lg'
      >
        <DialogContent xl={6} md={12}>
          <Grid>
            {/* <ListItem component="div" disablePadding>
              <Paper sx={{ width: 320, maxWidth: '100%' }}>
                <MenuList>
                  <MenuItem style={{ fontWeight: '700' }}>
                    <ListItemText >History Type</ListItemText>
                    <ListItemText style={{ textAlign: 'right' }}>View Datapoint</ListItemText>
                  </MenuItem>
                  <Divider />
                  {histories.map((item, index) => {
                    var homeHistory = historyTypes[item.historyTypeId];
                    return (
                      <MenuItem>
                        <ListItemText>{homeHistory.hLabel}</ListItemText>
                        <Switch {...label} />
                      </MenuItem>
                    );
                  })}
                  <Divider />
                </MenuList>
                <Button variant="contained">Pay</Button>
              </Paper>
            </ListItem> */}
            {histories.map((item, index) => {
              var homeHistory = historyTypes[item.historyTypeId];
              return (
                <ListItem key={index} component="div" disablePadding>
                  <TextField
                    className={classes.listhistoryType}
                    id="history-type"
                    label="History Type"
                    value={homeHistory.hLabel}
                    variant="filled"
                    disabled={true}
                  >
                  </TextField>
                  {homeHistory.imgNeed === true? (
                    <Grid className={classes.imgLabel}>
                      <label htmlFor={`${historyTypes[item.historyTypeId].hLabel}-imag`}>
                        <Grid>
                          <StyledInput
                            accept="image/*"
                            id={`${historyTypes[item.historyTypeId].hLabel}-imag`}
                            multiple
                            type="file"
                            disabled={true}
                          />
                          <IconButton
                            color="primary"
                            aria-label="upload picture"
                            component="span"
                          >
                            <Avatar
                              alt="Image"
                              src={item.houseImg}
                            />
                          </IconButton>
                        </Grid>
                      </label>
                    </Grid>
                  ) : null}
                  {homeHistory.descNeed === true? (
                    <TextField
                      id="standard-multiline-static"
                      label={'Picture Description'}
                      rows={4}
                      variant="filled"
                      className={classes.addHistoryField}
                      value={item.desc}
                      disabled={true}
                    />
                  ) : null}
                  {homeHistory.brandNeed === true? (
                    <TextField
                      id="standard-multiline-static"
                      label={'Brand'}
                      rows={4}
                      variant="filled"
                      className={classes.addHistoryField}
                      value={item.houseBrand}
                      disabled={true}
                    />
                  ) : null}
                  {homeHistory.brandTypeNeed === true? (
                    <TextField
                      id="standard-multiline-static"
                      label={'Brand Type'}
                      rows={4}
                      variant="filled"
                      className={classes.addHistoryField}
                      value={item.brandType}
                      disabled={true}
                    />
                  ) : null}
                  {homeHistory.yearNeed === true? (
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <Grid container justify="space-around">
                        <DatePicker
                          views={['year', 'month', 'day']}
                          label="Date"
                          value={new Date(Number(item.yearField))}
                          renderInput={(params) => (
                            <TextField className={classes.needField} variant="filled" {...params} helperText={null} />
                          )}
                          disabled={true}
                          disableOpenPicker={true}
                        />
                      </Grid>
                    </LocalizationProvider>
                  ) : null}
                  {(homeHistory.otherInfo && showDataPoint) && <TextField
                    id="standard-multiline-static"
                    label={'Other information'}
                    rows={4}
                    variant="filled"
                    className={classes.listHistoryField}
                    value={item.otherInfo}
                    disabled={true}
                  />}
                  {(item.contractId > 0 && showDataPoint) ? (
                    <>
                      <IconButton
                        onClick={() => {
                          const contract = contracts.find((c) => c.contractId == item.contractId);
                          console.log('contract', contract)
                          setCContract(contract);
                          setShowCContract(true);
                        }}
                      >
                        <DocumentIcon />
                      </IconButton>
                    </>
                  ) : ""
                  }
                </ListItem>
              );
            })}
            <ContractDetailDialog
              open={showCContract}
              onClose={() => setShowCContract(false)}
              contract={cContract}
              historyTypes={historyTypes}
            />
          </Grid>
        </DialogContent>
      </Dialog>
    </Grid >
  )
}

function mapStateToProps(state) {
  return {
    account: state.account,
    houseNft: state.houseNft,
    historyTypes: state.historyTypes
  };
}

export default connect(mapStateToProps)(Dashboard);