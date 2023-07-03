import React, { Component, useEffect } from "react";
import web3 from "./web3";
import lotteryBallot from "./dappContract";
import carphoto from "./images/car.jpg";
import phonephoto from "./images/phone.jpg";
import laptopphoto from "./images/laptop.jpg";
import "./App.css"

class App extends Component {
  // Ορίζω τις state μεταβλητές που χρειάζομαι στο πρόγραμμα
  state = {
    beneficiary: "",
    mastoras: "",
    newBeneficiary: "",
    balance: "",
    currentAccount: "",
    carBids: [],
    phoneBids: [],
    laptopBids: [],
    value: "",
    message: "Hello! Welcome to David's Lottery where you can win nice and expensive items",
    winnersArray: [],
    winnerMessage: "",
    winnersDeclared: false,
    beneBtn: false,
    winnersDeclaredBtn: false,
    amIwinnerBtn: false,
    bidBtn: false
  };

  async componentDidMount(){
    window.ethereum.on('accountsChanged', (accounts) => {
      window.location.reload();
    })

    // Ορίζω τις state μεταβλητές οι οποίες είναι με την σειρά (η διεύθυνση του ιδιοκτήτη
    // η διεύθυνση του κ. Μάστορα, πόσα bids έχουν γίνει σε κάθε item, αν έχουν κληρωθεί
    // οι νικητές, το υπόλοιπο του συμβολαίου, η διεύθυνση που είναι τώρα συνδεδεμένη)
    const beneficiary = await lotteryBallot.methods.beneficiary().call();
    const mastoras = await lotteryBallot.methods.mastoras().call();
    const carBids = await lotteryBallot.methods.getCarItemBids().call();
    const phoneBids = await lotteryBallot.methods.getPhoneItemBids().call();
    const laptopBids = await lotteryBallot.methods.getLaptopItemBids().call();
    const winnersDeclared = await lotteryBallot.methods.winnersDeclaredBool().call();
    const balance = await web3.eth.getBalance(lotteryBallot.options.address);
    const currentAccount = (await web3.eth.getAccounts())[0];
    this.setState({ beneficiary, mastoras, carBids, phoneBids, laptopBids, winnersDeclared, balance, currentAccount });

    // Ορίζω τα events που έχει το smart contract μου για να τα χρησιμοποιήσω παρακάτω
    lotteryBallot.events.BidInCar({}, this.handleBidInCar);
    lotteryBallot.events.BidInPhone({}, this.handleBidInPhone);
    lotteryBallot.events.BidInLaptop({}, this.handleBidInLaptop);
    lotteryBallot.events.winnersSelected({}, this.handlewinnersSelected);
    lotteryBallot.events.resetContractEvent({}, this.handleresetContractEvent);
    lotteryBallot.events.moneyWithdrawed({}, this.handlemoneyWithdrawed);
    lotteryBallot.events.transferContract({}, this.handletransferContract);

    // Εδώ κάθε φορά που αλλάζει η διεύθυνση πορτοφολιού καλώ την συγκεκριμένη συνάρτηση
    // η οποία ορίζει ποια κουμπιά πρέπει να είναι ενεργά και ποια απενεργοποιημένα
    this.disableButtons();

  }

  // Η συνάρτηση η οποία ορίζει ποια κουμπιά πρέπει να είναι ενεργά και ποια απενεργοποιημένα
  disableButtons() {
    let isBenOrMas = false;
    
    //Εδώ ελέγχω αν η διεύθυνση που είναι συνδεδεμένη τώρα είναι ο beneficiary ή ο κ. Μάστορας
    if (this.state.currentAccount == this.state.beneficiary || this.state.currentAccount == this.state.mastoras){
      isBenOrMas = true;
    }else{
      isBenOrMas = false;
    }

    // Εδώ ορίζω τις state μεταβλητές που χρησιμοποιούνται για να ενεργοποιήσουν ή όχι τα κουμπιά
    // Όταν η state μεταβλητή είναι false τότε το κουμπί είναι ενεργό ενώ αν είναι true τότε
    // το κουμπί είναι απενεργοποιημένο
    if (this.state.winnersDeclared && isBenOrMas){ //Αν έχει γίνει η κλήρωση και είναι ο beneficiary
      this.setState({beneBtn: false, winnersDeclaredBtn: true, amIwinnerBtn: true, bidBtn: true});
    }else if (!this.state.winnersDeclared && isBenOrMas){ //Αν ΔΕΝ έχει γίνει η κλήρωση και είναι ο beneficiary
      this.setState({beneBtn: false, winnersDeclaredBtn: false, amIwinnerBtn: true, bidBtn: true});
    }else if (this.state.winnersDeclared && !isBenOrMas){ //Αν έχει γίνει η κλήρωση και ΔΕΝ είναι ο beneficiary
      this.setState({beneBtn: true, winnersDeclaredBtn: true, amIwinnerBtn: false, bidBtn: true});
    }else{ //Αν ΔΕΝ έχει γίνει η κλήρωση και ΔΕΝ είναι ο beneficiary
      this.setState({beneBtn: true, winnersDeclaredBtn: true, amIwinnerBtn: true, bidBtn: false});
    }
  }

  // Παρατηρήσεις που γίνονται σε κάθε συνάρτηση:
  // 1. Μόλις καλείται κάποια συνάρτηση αλλάζει η state μεταβλητή του μηνύματος που εμφανίζεται
  //    στη μέση του Dapp ώστε να ενημερώνει τον παίχτη ανα πάσα ώρα και στιγμή τι κάνει τώρα
  //    το Dapp μας. π.χ. όταν πατιέται ένα κουμπί bid βγαίνει ένα μήνυμα ότι η συναλλαγή
  //    έχει ξεκινήσει. Όταν γίνει η συναλλαγή αλλάζει η state σε μήνυμα που ενημερώνει
  //    ότι η συναλλαγή ολοκληρώθηκε.
  // 2. Όλες οι συναρτήσεις όταν καλούνται στην παράμετρο from που χρησιμοποιείται όταν
  //    καλείται η συνάρτηση του συμβολαίο χρησιμοποείται η διεύθυνση που είναι συνδεδεμένη
  //    τώρα, δηλαδή η state μεταβλητή currentAccount
  // 3. Στις συναρτήσεις για τα Bids και οι τρείς έχουν value 0.01 ether.
  
  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Bid" για το αμάξι
  bidOnCar = async () => {
    this.setState({message: "Waiting on transaction success..."});

    await lotteryBallot.methods.carItemBid().send({
      from: this.state.currentAccount,
      value: web3.utils.toWei("0.01", "ether")
    })

    this.setState({message: "You have bidded on the Car"});
  }

  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Bid" για το κινητό
  bidOnPhone = async () => {
    this.setState({message: "Waiting on transaction success..."});

    await lotteryBallot.methods.phoneItemBid().send({
      from: this.state.currentAccount,
      value: web3.utils.toWei("0.01", "ether")
    })

    this.setState({message: "You have bidded on the Phone"});
  }

  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Bid" για το λάπτοπ
  bidOnLaptop = async () => {
    this.setState({message: "Waiting on transaction success..."});

    await lotteryBallot.methods.laptopItemBid().send({
      from: this.state.currentAccount,
      value: web3.utils.toWei("0.01", "ether")
    })

    this.setState({message: "You have bidded on the Laptop"});
  }

  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Declare Winners" για την κλήρωση των νικητών
  declareWinners = async() => {
    this.setState({message: "Τhe process of selecting the winners has started..."});

    await lotteryBallot.methods.declareWinners().send({
      from: this.state.currentAccount
    })
    
    // Εδώ καθώς τελείωνει η κλήρωση αποθηκεύω και τους νικητές στην state μεταβλητή
    // που χρησιμοποιώ για να κρατάω τους νικητές
    const winnersArray = await lotteryBallot.methods.amIWinner().call();
    this.setState({winnersArray});

    this.setState({message: "Winners have been selected!"});
  }

  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Am I Winner" για να δει κάποιος
  // αν έχει νικήσει κάτι
  amIWinner = async() => {
    this.setState({message: "We fetch the data to see if you are winner..."});

    // Εδώ καλώ 2 φορές την μέθοδο του συμβολαίου που επιστρέφει τον πίνακα με τους νικητές.
    // Ο λόγος είναι ότι όταν την καλούσα μία φορά δεν δούλευε για κάποιο λόγο δηλαδή έπρεπε
    // να πατήσω το κουμπί "Am I Winner" δύο φορές για να μου φέρει σωστά αποτελέσματα. Έτσι
    // χρησιμοποίησα αυτή την λύση, η οποία δουλεύει τέλεια
    const winnersArray = await lotteryBallot.methods.amIWinner().call();
    this.setState({winnersArray});
    const winnersArray2 = await lotteryBallot.methods.amIWinner().call();
    this.setState({winnersArray: winnersArray2});

    let car = false;
    let phone = false;
    let laptop = false;

    // Εδώ ελέγχω αν η διεύθυνση που είναι συνδεδεμένη τώρα βρίσκεται κάπου μέσα στον πίνακα
    // των νικητών. Και αναλόγα με το που βρίσκεται κάνω την ανάλογη bool μεταβλητή true.
    // (Έχω ρυθμίσει εγώ το συμβόλαιο έτσι ώστε στην πρώτη θέση να είναι ο νικητής του αμαξιού,
    // στην δεύτερη του κινητού και στην τρίτη του λάπτοπ)
    // Άρα π.χ. αν η διέυθυνση του ταιριάζει με αυτή που είναι στην πρώτη θέση του πίνακα των νικητών
    // αυτό σημαίνει ότι έχει κερδίσει το αμάξι και η bool μεταβλητή του αμαξιού (car) γίνεται true.
    for (let i=0; i<this.state.winnersArray.length; i++){
      if (this.state.winnersArray[i] == this.state.currentAccount){
        console.log(this.state.winnersArray[i]);
        if (i==0){
          car = true;
        } else if (i==1){
          phone = true;
        } else{
          laptop = true;
        }
      }
    }

    // Εδώ επειδή δεν ήθελα να εμφανίζω μόνο αριθμούς αλλά να εμφανίζω ακριβώς τι έχει κερδίσει ο καθένας
    // με βάση των bool μεταβήτών για κάθε item εμφανίζεται και το ανάλογο μήνυμα στο Dapp
    // π.χ. αν τα έχει κερδίσει όλα και είναι και οι τρεις bool true τότε εμφανίζει το πρώτο μήνυμα:
    // "You have won all the items: Car, Phone, Laptop"
    if (car){
      if(phone){
        if(laptop){
          this.setState({winnerMessage: "You have won all the items: Car, Phone, Laptop"})
        } else{
          this.setState({winnerMessage: "You have won 2 of the items: Car, Phone"})
        }
      } else{
        if (laptop){
          this.setState({winnerMessage: "You have won 2 of the items: Car, Laptop"})
        } else{
          this.setState({winnerMessage: "You have won 1 of the items: Car"})
        }
      }
    } else{
      if (phone){
        if (laptop){
          this.setState({winnerMessage: "You have won 2 of the items: Phone, Laptop"})
        } else{
          this.setState({winnerMessage: "You have won 1 of the items: Phone"})
        }
      } else{
        if (laptop){
          this.setState({winnerMessage: "You have won 1 of the items: Laptop"})
        } else{
          this.setState({winnerMessage: "Sorryyy... You didn't win anything"})
        }
      }
    }

    this.setState({message: "Check under the balance if you won something!"});
  }

  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Withdraw" για το να πάρει ο beneficiary
  // το υπόλοιπο του συμβολαίου στον λογαριασμό του
  withdraw = async() => {
    this.setState({message: "The withdraw procedure has started..."});

    await lotteryBallot.methods.withdraw().send({
      from: this.state.currentAccount
    })

    this.setState({message: "The money have been transfered to your account!"});
  }

  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Reset Lottery" για το να ξεκινήσει
  // εκ νέου νέος γύρος για την κληρωτίδα
  resetContract = async() => {
    this.setState({message: "Τhe process of reseting the lottery has started..."});

    await lotteryBallot.methods.resetLottery().send({
      from: this.state.currentAccount
    })

    this.setState({message: "The Lottery has been reset!"});
  }

  // Αυτό είναι ένα event το οποίο ΔΕΝ πυροδοτείται στην blockchain αλλά χρησιμοποιείται
  // για να πάρει την διεύθυνση που έχει πληκτρολογήσει ο beneficiary στο input label 
  // όταν πατάει το κουμπί "Transfer Contract"
  // Άρα μόλις πατηθεί το κουμπί πρώτα γίνεται αυτό ώστε να πάρει η state μεταβλητή την διεύθυνση
  // του νέου ιδιοκτήτη και μετά καλείται η συνάρτηση του συμβολαίου
  handleNewBeneficiary = (event) => {
    this.setState({ newBeneficiary: event.target.value});
  }

  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Transfer Contract" για μεταφερθούν τα
  // δικαιώματα του beneficiary στην καινούργια διεύθυνση
  // Όπως έγραψα και από πάνω πρώτα πυροδοτείται το παραπάνω συμβάν και μετά εκτελείται αυτή
  transferContract = async() => {
    this.setState({message: "Τhe process of transfering the copyright to other address has started..."});

    await lotteryBallot.methods.transferBeneficiary(this.state.newBeneficiary).send({
      from: this.state.currentAccount
    })

    // Εδώ εφόσον γίνει η αλλαγή του ιδιοκτήτη του συμβολαίου 
    // ανανεώνω τις state μεταβλητές
    this.setState({beneficiary: this.state.newBeneficiary});
    this.setState({newBeneficiary: ""});
    this.setState({message: "The transfer completed!"});
    this.disableButtons();
  }

  // Η συνάρτηση που καλείται όταν πατιέται κουμπί "Destroy Contract" για το να καταστραφεί το συμβόλαιο
  destroyContract = async() => {
    this.setState({message: "Τhe process of destroying contract has started..."});

    await lotteryBallot.methods.destroyContract().send({
      from: this.state.currentAccount
    })

    this.setState({message: "The contract has been destroyed"});
  }

  // Η συνάρτηση που καλείται όταν πυροδοτείται το event στην Blockchain που αφορά
  // ότι κάποιος έκανε bid στο αμάξι
  handleBidInCar = async (error, event) => {
    if (error){
      console.error(error);
    } else {
      // Ανανεώνω τις state μεταβλητές για τα Bids στο αμάξι και του υπολοίπου του συμβολαίου
      const carBids = await lotteryBallot.methods.getCarItemBids().call();
      const balance = await web3.eth.getBalance(lotteryBallot.options.address);
      this.setState({carBids, balance});
    }
  }

  // Η συνάρτηση που καλείται όταν πυροδοτείται το event στην Blockchain που αφορά
  // ότι κάποιος έκανε bid στο κινητό
  handleBidInPhone = async (error, event) => {
    if (error){
      console.error(error);
    } else {
    // Ανανεώνω τις state μεταβλητές για τα Bids στο κινητό και του υπολοίπου του συμβολαίου
      const phoneBids = await lotteryBallot.methods.getPhoneItemBids().call();
      const balance = await web3.eth.getBalance(lotteryBallot.options.address);
      this.setState({phoneBids, balance});
    }
  }

  // Η συνάρτηση που καλείται όταν πυροδοτείται το event στην Blockchain που αφορά
  // ότι κάποιος έκανε bid στο λαπτοπ
  handleBidInLaptop = async (error, event) => {
    if (error){
      console.error(error);
    } else{
      // Ανανεώνω τις state μεταβλητές για τα Bids στο λάπτοπ και του υπολοίπου του συμβολαίου
      const laptopBids = await lotteryBallot.methods.getLaptopItemBids().call();
      const balance = await web3.eth.getBalance(lotteryBallot.options.address);
      this.setState({laptopBids, balance});
    }
  }

  // Η συνάρτηση που καλείται όταν πυροδοτείται το event στην Blockchain που αφορά
  // ότι έχει γίνει η κλήρωση των νικητών
  handlewinnersSelected = async (error, event) => {
    if (error){
      console.error(error);
    } else {
      // Ανανεώνω τις state μεταβλητές για των πίνακα των νικητών και την bool state για το αν έχει γίνει κλήρωση
      const winnersArray = await lotteryBallot.methods.amIWinner().call();
      this.setState({winnersArray, winnersDeclared: true});
      // Καλώ την συνάρτηση για τα κουμπιά γιατί πρέπει να απενεργοποιηθεί το κουμπί "Declare Winners"
      this.disableButtons();
    }
  }

  // Η συνάρτηση που καλείται όταν πυροδοτείται το event στην Blockchain που αφορά
  // ότι έχει γίνει reset στην κληρωτίδα και μπορούν οι παίχτε να ξανα αγοράσουν
  // λαχνό εκ νέου
  handleresetContractEvent = async (error, event) => {
    if (error){
      console.error(error);
    } else {
      // Ανανεώνω τις state μεταβλητές που εμφανίζουν πόσα bids έχουν γίνει σε κάθε item
      const carBids = await lotteryBallot.methods.getCarItemBids().call();
      const phoneBids = await lotteryBallot.methods.getPhoneItemBids().call();
      const laptopBids = await lotteryBallot.methods.getLaptopItemBids().call();
      this.setState({carBids, phoneBids, laptopBids, winnersDeclared: false});
      // Καλώ την συνάρτηση για τα κουμπιά γιατί πρέπει να ενεργοποιηθεί ξανά το κουμπί "Declare Winners"
      this.disableButtons();
      this.disableButtons();
    }
  }

  // Η συνάρτηση που καλείται όταν πυροδοτείται το event στην Blockchain που αφορά
  // ότι ο beneficiary έκανε ανάληψη τα λεφτά που υπήρχαν στο συμβόλαιο
  handlemoneyWithdrawed = async (error, event) => {
    if (error){
      console.error(error);
    } else {
      // Ανανεώνω την state μεταβλητή του υπολοίπου
      const balance = await web3.eth.getBalance(lotteryBallot.options.address);
      this.setState({balance});
    }
  }

  // Η συνάρτηση που καλείται όταν πυροδοτείται το event στην Blockchain που αφορά
  // ότι το transfer του beneficiary και καλείται η συνάρτηση για να κάνει disable
  // τα ανάλογα κουμπιά
  handletransferContract = async (error, event) => {
    if (error){
      console.error(error);
    } else {
      this.disableButtons();
    }
  }

    
  render(){
    return(
      <div class="app">
        {/* Ο τίτλος */}
        <h1>Lottery - Ballot</h1>
        {/* Τα cards με τα items και τα κουμπία τους κτλ. */}
        <section class="cards">
            <div class="itemCards" id="itemCar">
              <h2>Car</h2>
              <img src={carphoto} alt="car-image"/>
              <div class="cardContainer">
                <p class="bidsNumber">{this.state.carBids.length}</p>
                <button class="bidBtn" onClick={this.bidOnCar} disabled={this.state.bidBtn}>Bid</button>
              </div>
            </div>

            <div class="itemCards" id="itemPhone">
              <h2>Phone</h2>
              <img src={phonephoto} alt="car-image"/>
              <div class="cardContainer">
                <p>{this.state.phoneBids.length}</p>
                <button class="bidBtn" onClick={this.bidOnPhone} disabled={this.state.bidBtn}>Bid</button>
              </div>
            </div>

            <div class="itemCards" id="itemLaptop">
              <h2>Laptop</h2>
              <img src={laptopphoto} alt="car-image"/>
              <div class="cardContainer">
                <p>{this.state.laptopBids.length}</p>
                <button class="bidBtn" onClick={this.bidOnLaptop} disabled={this.state.bidBtn}>Bid</button>
              </div>
            </div>
        </section>
        {/* Τα κεντρικά μηνύματα του Dapp που αλλάζουν */}
        <section id="messages">
          <h3>Contract Status</h3>
          <p>{this.state.message}</p>
        </section>
        {/* Η διεύθυνση του currentAccount και το κουμπί "Am I Winner" */}
        <div class="infoContainer">
          <section class="userContainer">
            <h3>Current Account Connected</h3>
            <p>{this.state.currentAccount}</p>
            <button onClick={this.amIWinner} disabled={this.state.amIwinnerBtn}>Am I winner</button>
          </section>
          {/* Το balance και το μήνυμα αν έχει κερδίσει κάτι */}
          <section class="balanceContainer">
            <h3>Current Balance</h3>
            <p>{web3.utils.fromWei(this.state.balance, 'ether')}</p>
            <p id="winnerMessage">{this.state.winnerMessage}</p>
          </section>
          {/* Η διεύθυνση του beneficiary και τα κουμπιά του */}
          <section class="beneContainer">
            <h3>Beneficiary's Account</h3>
            <p>{this.state.beneficiary}</p>
            <div class="buttonsFlex">
              <button onClick={this.declareWinners} disabled={this.state.winnersDeclaredBtn}>Declare Winners</button>
              <button onClick={this.withdraw} disabled={this.state.beneBtn}>Withdraw</button>
            </div>
            <div class="buttonsFlex">
              <button onClick={this.resetContract} disabled={this.state.beneBtn}>Reset Lottery</button>
              <button onClick={this.destroyContract} disabled={this.state.beneBtn}>Destroy Contract</button>
            </div>
            <div class="buttonsFlex">
              <button onClick={this.transferContract} disabled={this.state.beneBtn}>Transfer Contract</button>
              <input type="text" value={this.state.newBeneficiary} onChange={this.handleNewBeneficiary}></input>
            </div>
          </section>
        </div>
      </div>
    );
  }
}

export default App;